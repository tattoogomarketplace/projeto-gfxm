'use client';

import { useCallback, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from '@/lib/toast';
import { CheckCircle2, FileText, Loader2, ShieldAlert, Upload, X, XCircle } from 'lucide-react';
import { GlassContainer } from '@/components/ui/glass-container';
import { authedFetch } from '@/lib/utils/authed-fetch';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/use-i18n';
import { formatAppError } from '@/lib/error-handler';
import type { MessageKey } from '@/lib/i18n';

export type KycStatusValue =
  | 'pendente'
  | 'em_analise'
  | 'aprovado'
  | 'rejeitado'
  | 'nao_aplicavel';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']);
const ACCEPTED_INPUT_TYPES = 'application/pdf,image/jpeg,image/png';

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function describeUploadFailure(err: unknown): string {
  if (err instanceof TypeError) {
    const raw = err.message || '';
    if (/load failed|failed to fetch|networkerror/i.test(raw)) {
      return 'upload-network-failed';
    }
  }
  return err instanceof Error ? err.message : 'upload-failed';
}

const STATUS_UI: Record<
  KycStatusValue,
  { label: MessageKey; tone: string; icon: typeof CheckCircle2 }
> = {
  pendente: {
    label: 'kyc.statusPending',
    tone: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    icon: ShieldAlert,
  },
  em_analise: {
    label: 'kyc.statusReview',
    tone: 'text-sky-300 border-sky-500/30 bg-sky-500/10',
    icon: Loader2,
  },
  aprovado: {
    label: 'kyc.statusApproved',
    tone: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10',
    icon: CheckCircle2,
  },
  rejeitado: {
    label: 'kyc.statusRejected',
    tone: 'text-red-300 border-red-500/30 bg-red-500/10',
    icon: XCircle,
  },
  nao_aplicavel: {
    label: 'kyc.statusNa',
    tone: 'text-zinc-400 border-white/10 bg-white/5',
    icon: FileText,
  },
};

type UploadPhase = 'idle' | 'presigning' | 'uploading' | 'validating';

const PHASE_PROGRESS: Record<UploadPhase, number> = {
  idle: 0,
  presigning: 18,
  uploading: 62,
  validating: 92,
};

type ProfessionalKycPanelProps = {
  status: KycStatusValue | string;
  onStatusChange?: (status: KycStatusValue) => void;
};

function normalizeStatus(status: string): KycStatusValue {
  return status in STATUS_UI ? (status as KycStatusValue) : 'pendente';
}

export function ProfessionalKycPanel({ status, onStatusChange }: ProfessionalKycPanelProps) {
  const { getToken } = useAuth();
  const { t } = useI18n();
  const { triggerHaptic } = useHapticFeedback();
  const inputRef = useRef<HTMLInputElement>(null);
  const [currentStatus, setCurrentStatus] = useState<KycStatusValue>(normalizeStatus(status));
  const [phase, setPhase] = useState<UploadPhase>('idle');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [extractedName, setExtractedName] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const busy = phase !== 'idle';
  const canSubmit = Boolean(pendingFile) && !busy;
  const progress = PHASE_PROGRESS[phase];
  const ui = STATUS_UI[currentStatus];
  const StatusIcon = ui.icon;

  const applyStatus = useCallback(
    (next: KycStatusValue) => {
      setCurrentStatus(next);
      onStatusChange?.(next);
    },
    [onStatusChange]
  );

  const handleSelect = useCallback(
    (file: File) => {
      setError(null);
      setExtractedName(null);
      setConfidence(null);

      const contentType = resolveUploadContentType(file);
      if (!contentType || !ALLOWED_TYPES.has(contentType)) {
        const message = t('toast.invalidFormat', { formats: t('kyc.formatPdf') });
        setError(message);
        toast.error(message);
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        const message = t('toast.fileTooLarge');
        setError(message);
        toast.error(message);
        return;
      }

      setPendingFile(file);
      triggerHaptic('light');
    },
    [triggerHaptic, t]
  );

  const handleRemove = useCallback(() => {
    setPendingFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
    triggerHaptic('light');
  }, [triggerHaptic]);

  const uploadFile = useCallback(
    async (file: File) => {
      setError(null);
      setExtractedName(null);
      setConfidence(null);
      setPhase('presigning');

      const contentType = resolveUploadContentType(file);

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
          throw new Error(presign.erro || t('toast.uploadPrepareFailed'));
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
          throw new Error(t('toast.uploadPutFailed'));
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
          throw new Error(result.erro || t('toast.docValidateFailed'));
        }

        const next = normalizeStatus(result.status || 'em_analise');
        applyStatus(next);
        if (result.extractedName) setExtractedName(result.extractedName);
        if (typeof result.confidenceScore === 'number') setConfidence(result.confidenceScore);

        setPendingFile(null);
        if (inputRef.current) inputRef.current.value = '';
        triggerHaptic('success');

        if (next === 'aprovado') {
          toast.success(t('toast.kycApproved'));
        } else if (next === 'rejeitado') {
          toast.error(t('toast.kycRejected'));
        } else {
          toast.message(t('toast.kycReceived'));
        }
      } catch (err) {
        console.error('[kyc-upload] rejeição de rede', err);
        const message = formatAppError(err, 'api');
        setError(message);
        toast.error(message);
      } finally {
        setPhase('idle');
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [applyStatus, getToken, triggerHaptic, t]
  );

  const handleSubmit = useCallback(() => {
    if (!pendingFile || busy) return;
    void uploadFile(pendingFile);
  }, [busy, pendingFile, uploadFile]);

  const phaseLabel =
    phase === 'presigning'
      ? t('kyc.phasePresign')
      : phase === 'uploading'
        ? t('kyc.phaseUpload')
        : phase === 'validating'
          ? t('kyc.phaseValidate')
          : null;

  return (
    <GlassContainer className="space-y-5 border-border/50 p-5 sm:p-6 dark:border-border/50">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-500">
            {t('kyc.badge')}
          </p>
          <h3 className="mt-1 text-lg font-bold text-neutral-900 dark:text-white">{t('kyc.title')}</h3>
          <p className="mt-1 text-sm leading-relaxed text-zinc-400">
            {t('kyc.subtitle')}
          </p>
        </div>
        <span
          className={cn(
            'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold',
            ui.tone
          )}
        >
          <StatusIcon className={cn('h-3.5 w-3.5', currentStatus === 'em_analise' && 'animate-spin')} />
          {t(ui.label)}
        </span>
      </div>

      {currentStatus === 'aprovado' ? (
        <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {extractedName ? t('kyc.approvedBannerNamed', { name: extractedName }) : t('kyc.approvedBanner')}
        </p>
      ) : (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_INPUT_TYPES}
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleSelect(file);
              event.target.value = '';
            }}
          />

          <AnimatePresence mode="wait" initial={false}>
            {pendingFile ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                className="flex items-center gap-3 rounded-2xl border border-border/60 bg-white/5 p-3 backdrop-blur-md dark:bg-white/[0.04]"
              >
                <span className="flex h-11 w-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-orange-500/25 bg-orange-500/10 text-orange-400">
                  <FileText className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-neutral-900 dark:text-white">
                    {pendingFile.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-zinc-500">
                    {formatFileSize(pendingFile.size)} · {t('kyc.readyToSend')}
                  </span>
                </span>
                <motion.button
                  type="button"
                  onClick={handleRemove}
                  disabled={busy}
                  aria-label={t('kyc.removeFile')}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  className="flex h-11 w-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-border/60 text-zinc-400 transition-colors hover:border-red-500/50 hover:text-red-400 disabled:opacity-50"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </motion.button>
              </motion.div>
            ) : (
              <motion.button
                key="dropzone"
                type="button"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
                whileHover={!busy ? { scale: 1.01 } : undefined}
                whileTap={!busy ? { scale: 0.985 } : undefined}
                transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                className="group flex min-h-28 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-white/5 px-4 py-7 text-center backdrop-blur-md transition-colors hover:border-orange-500/70 hover:bg-orange-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60 disabled:opacity-60 dark:bg-white/[0.04]"
              >
                <Upload className="mb-2 h-6 w-6 text-amber-500 transition-transform duration-300 group-hover:-translate-y-0.5" strokeWidth={1.75} />
                <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                  {t('kyc.tapSend')}
                </span>
                <span className="mt-1 text-xs text-zinc-500">{t('kyc.formatPdf')}, {t('kyc.upToSize')}</span>
              </motion.button>
            )}
          </AnimatePresence>

          <motion.button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            whileHover={canSubmit ? { scale: 1.01 } : undefined}
            whileTap={canSubmit ? { scale: 0.985 } : undefined}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            className="relative flex min-h-12 w-full items-center justify-center overflow-hidden rounded-xl bg-orange-500 py-3 text-sm font-bold text-black shadow-[0_0_18px_rgba(249,115,22,0.28)] transition-colors hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/70 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400 disabled:shadow-none"
          >
            {busy ? (
              <motion.span
                aria-hidden
                className="absolute inset-y-0 left-0 bg-black/15"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: 'easeOut', duration: 0.45 }}
              />
            ) : null}
            <span className="relative z-10 flex items-center gap-2">
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                  {phaseLabel}
                </>
              ) : pendingFile ? (
                t('kyc.sendDocs')
              ) : (
                t('kyc.selectDoc')
              )}
            </span>
          </motion.button>
        </>
      )}

      {phaseLabel ? <p className="text-center text-xs text-amber-400">{phaseLabel}</p> : null}
      {confidence !== null ? (
        <p className="text-center text-xs text-zinc-500">{t('kyc.confidence', { confidence })}</p>
      ) : null}
      {error ? <p className="text-center text-xs text-red-400">{error}</p> : null}
    </GlassContainer>
  );
}
