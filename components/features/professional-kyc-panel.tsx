'use client';

import { useCallback, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { toast } from '@/lib/toast';
import { CheckCircle2, FileText, Loader2, ShieldAlert, Upload, XCircle } from 'lucide-react';
import { GlassContainer } from '@/components/ui/glass-container';
import { Button } from '@/components/ui/button';
import { authedFetch } from '@/lib/utils/authed-fetch';
import { cn } from '@/lib/utils';

export type KycStatusValue =
  | 'pendente'
  | 'em_analise'
  | 'aprovado'
  | 'rejeitado'
  | 'nao_aplicavel';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/heif',
  'application/pdf',
]);

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  heic: 'image/heic',
  heif: 'image/heif',
  pdf: 'application/pdf',
};

/** iOS/Android frequentemente entregam `file.type` vazio; inferimos pela extensão. */
function resolveUploadContentType(file: File): string {
  if (file.type && ALLOWED_TYPES.has(file.type)) {
    return file.type === 'image/jpg' ? 'image/jpeg' : file.type;
  }
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return CONTENT_TYPE_BY_EXT[ext] ?? '';
}

function describeUploadFailure(err: unknown): string {
  if (err instanceof TypeError) {
    const raw = err.message || '';
    if (/load failed|failed to fetch|networkerror/i.test(raw)) {
      return 'Falha de rede ao enviar o arquivo para o storage. Tente novamente.';
    }
  }
  return err instanceof Error ? err.message : 'Falha no envio do documento.';
}

const STATUS_UI: Record<
  KycStatusValue,
  { label: string; tone: string; icon: typeof CheckCircle2 }
> = {
  pendente: {
    label: 'Pendente',
    tone: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    icon: ShieldAlert,
  },
  em_analise: {
    label: 'Em Análise',
    tone: 'text-sky-300 border-sky-500/30 bg-sky-500/10',
    icon: Loader2,
  },
  aprovado: {
    label: 'Aprovado',
    tone: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10',
    icon: CheckCircle2,
  },
  rejeitado: {
    label: 'Rejeitado',
    tone: 'text-red-300 border-red-500/30 bg-red-500/10',
    icon: XCircle,
  },
  nao_aplicavel: {
    label: 'Não aplicável',
    tone: 'text-zinc-400 border-white/10 bg-white/5',
    icon: FileText,
  },
};

type UploadPhase = 'idle' | 'presigning' | 'uploading' | 'validating';

type ProfessionalKycPanelProps = {
  status: KycStatusValue | string;
  onStatusChange?: (status: KycStatusValue) => void;
};

function normalizeStatus(status: string): KycStatusValue {
  return status in STATUS_UI ? (status as KycStatusValue) : 'pendente';
}

export function ProfessionalKycPanel({ status, onStatusChange }: ProfessionalKycPanelProps) {
  const { getToken } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [currentStatus, setCurrentStatus] = useState<KycStatusValue>(normalizeStatus(status));
  const [phase, setPhase] = useState<UploadPhase>('idle');
  const [fileName, setFileName] = useState<string | null>(null);
  const [extractedName, setExtractedName] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const busy = phase !== 'idle';
  const ui = STATUS_UI[currentStatus];
  const StatusIcon = ui.icon;

  const applyStatus = useCallback(
    (next: KycStatusValue) => {
      setCurrentStatus(next);
      onStatusChange?.(next);
    },
    [onStatusChange]
  );

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setExtractedName(null);
      setConfidence(null);

      const contentType = resolveUploadContentType(file);
      if (!contentType || !ALLOWED_TYPES.has(contentType)) {
        setError('Envie um PDF ou imagem (JPG, PNG, WEBP, HEIC).');
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        setError('Arquivo acima de 10 MB.');
        return;
      }

      setFileName(file.name);
      setPhase('presigning');

      try {
        const tokenFn = () => getToken({ skipCache: true });
        const presignRes = await authedFetch(
          '/api/upload/presign',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: file.name, contentType }),
          },
          tokenFn
        );
        const presign = (await presignRes.json().catch(() => ({}))) as {
          presignedUrl?: string;
          fileKey?: string;
          publicUrl?: string;
          erro?: string;
        };
        if (!presignRes.ok || !presign.presignedUrl || !presign.fileKey) {
          console.error('[kyc-upload] presign recusado', {
            status: presignRes.status,
            erro: presign.erro,
          });
          throw new Error(presign.erro || 'Não foi possível preparar o upload.');
        }

        setPhase('uploading');
        // Content-Type DEVE ser idêntico ao assinado na URL. Qualquer header
        // extra (Authorization, credentials) quebra a assinatura e o CORS do
        // R2, o que o Safari reporta como TypeError "Load failed".
        const putRes = await fetch(presign.presignedUrl, {
          method: 'PUT',
          mode: 'cors',
          credentials: 'omit',
          cache: 'no-store',
          headers: { 'Content-Type': contentType },
          body: file,
        });
        if (!putRes.ok) {
          console.error('[kyc-upload] PUT R2 falhou', {
            status: putRes.status,
            statusText: putRes.statusText,
          });
          throw new Error('Falha ao enviar o arquivo para o storage.');
        }

        setPhase('validating');
        applyStatus('em_analise');
        const validateRes = await authedFetch(
          '/api/kyc/validate-document',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileKey: presign.fileKey,
              publicUrl: presign.publicUrl,
              contentType,
            }),
          },
          tokenFn
        );
        const result = (await validateRes.json().catch(() => ({}))) as {
          sucesso?: boolean;
          status?: KycStatusValue;
          extractedName?: string;
          confidenceScore?: number;
          erro?: string;
        };
        if (!validateRes.ok || !result.sucesso) {
          throw new Error(result.erro || 'Não foi possível validar o documento.');
        }

        const next = normalizeStatus(result.status || 'em_analise');
        applyStatus(next);
        if (result.extractedName) setExtractedName(result.extractedName);
        if (typeof result.confidenceScore === 'number') setConfidence(result.confidenceScore);

        if (next === 'aprovado') {
          toast.success('Documento aprovado. Sua bancada será liberada.');
        } else if (next === 'rejeitado') {
          toast.error('Documento rejeitado. Envie um documento nítido e oficial.');
        } else {
          toast.message('Documento recebido e em análise.');
        }
      } catch (err) {
        console.error('[kyc-upload] rejeição de rede', err);
        const message = describeUploadFailure(err);
        setError(message);
        toast.error(message);
      } finally {
        setPhase('idle');
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [applyStatus, getToken]
  );

  const phaseLabel =
    phase === 'presigning'
      ? 'Preparando upload…'
      : phase === 'uploading'
        ? 'Enviando documento…'
        : phase === 'validating'
          ? 'Analisando documento…'
          : null;

  return (
    <GlassContainer className="space-y-5 border-border/50 p-5 sm:p-6 dark:border-border/50">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-500">
            Verificação profissional
          </p>
          <h3 className="mt-1 text-lg font-bold text-neutral-900 dark:text-white">Verificação de Documentos Pessoais</h3>
          <p className="mt-1 text-sm leading-relaxed text-zinc-400">
            Sua conta de tatuador é independente do estúdio. Envie RG, CNH ou comprovante oficial
            para liberar agenda e recebimentos.
          </p>
        </div>
        <span
          className={cn(
            'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold',
            ui.tone
          )}
        >
          <StatusIcon className={cn('h-3.5 w-3.5', currentStatus === 'em_analise' && 'animate-spin')} />
          {ui.label}
        </span>
      </div>

      {currentStatus === 'aprovado' ? (
        <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          Documentos Pessoais homologados{extractedName ? ` para ${extractedName}` : ''}.
        </p>
      ) : (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,application/pdf"
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="flex min-h-24 w-full flex-col items-center justify-center rounded-xl border border-dashed border-amber-500/40 bg-neutral-50 px-4 py-6 text-center transition-colors hover:border-amber-500 hover:bg-amber-500/5 disabled:opacity-60 dark:bg-[#121212]"
          >
            <Upload className="mb-2 h-6 w-6 text-amber-500" />
            <span className="text-sm font-semibold text-neutral-900 dark:text-white">
              {fileName ? fileName : 'Toque para enviar o documento'}
            </span>
            <span className="mt-1 text-xs text-zinc-500">PDF ou imagem, até 10 MB</span>
          </button>
          <Button
            type="button"
            className="w-full"
            isLoading={busy}
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? phaseLabel : 'Enviar documentos'}
          </Button>
        </>
      )}

      {phaseLabel ? <p className="text-center text-xs text-amber-400">{phaseLabel}</p> : null}
      {confidence !== null ? (
        <p className="text-center text-xs text-zinc-500">Confiança da análise: {confidence}%</p>
      ) : null}
      {error ? <p className="text-center text-xs text-red-400">{error}</p> : null}
    </GlassContainer>
  );
}
