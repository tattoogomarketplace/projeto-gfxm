'use client';

import { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@clerk/nextjs';
import {
  BadgeCheck,
  CheckCircle2,
  FileText,
  Images,
  Loader2,
  ShieldAlert,
  Sparkles,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { authedFetch } from '@/lib/utils/authed-fetch';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/use-i18n';
import { formatAppError } from '@/lib/error-handler';

export type ProfessionalDocumentStatus = 'pendente' | 'enviado' | 'em_analise' | 'aprovado' | 'rejeitado';

export type ProfessionalDocumentKey = 'pessoal' | 'habilidade';

export type ProfessionalDocumentSubmission = Partial<
  Record<ProfessionalDocumentKey, { fileKey: string; publicUrl: string; fileName: string }>
>;

type DocumentSlot = {
  file: File | null;
  status: ProfessionalDocumentStatus;
  error: string | null;
};

type SlotDefinition = {
  key: ProfessionalDocumentKey;
  title: string;
  description: string;
  hint: string;
  icon: typeof Images;
};

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']);
const ACCEPTED_INPUT_TYPES = 'application/pdf,image/jpeg,image/png';
const FORMAT_HINT = 'JPG, PNG ou PDF · até 10 MB';

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  pdf: 'application/pdf',
};

const SLOTS: SlotDefinition[] = [
  {
    key: 'pessoal',
    title: 'Documentos Pessoais (RG / CNH)',
    description: 'Frente e verso nítidos do seu documento oficial com foto.',
    hint: FORMAT_HINT,
    icon: Images,
  },
  {
    key: 'habilidade',
    title: 'Comprovação de Habilidade / Diploma',
    description: 'Diploma, certificado ou comprovação da sua atuação como tatuador.',
    hint: FORMAT_HINT,
    icon: BadgeCheck,
  },
];

type StatusUi = {
  label: string;
  tone: string;
  icon: typeof ShieldAlert;
  spin?: boolean;
};

const STATUS_UI: Record<ProfessionalDocumentStatus, StatusUi> = {
  pendente: {
    label: 'Pendente',
    tone: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    icon: ShieldAlert,
  },
  enviado: {
    label: 'Enviado',
    tone: 'text-orange-300 border-orange-500/30 bg-orange-500/10',
    icon: CheckCircle2,
  },
  em_analise: {
    label: 'Em análise',
    tone: 'text-sky-300 border-sky-500/30 bg-sky-500/10',
    icon: Loader2,
    spin: true,
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

function describeFileType(file: File): string {
  const contentType = resolveUploadContentType(file);
  if (contentType === 'application/pdf') return 'PDF';
  return 'Imagem';
}

async function uploadDocument(
  file: File,
  tokenFn: () => Promise<string | null>
): Promise<{ fileKey: string; publicUrl: string }> {
  const contentType = resolveUploadContentType(file);

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
    throw Object.assign(new Error(presign.erro || 'upload-prepare-failed'), {
      code: 'upload_prepare_failed',
    });
  }

  // O Content-Type DEVE ser idêntico ao assinado; headers extras quebram a
  // assinatura do R2 e o CORS (Safari reporta como TypeError "Load failed").
  const putRes = await fetch(presign.presignedUrl, {
    method: 'PUT',
    mode: 'cors',
    credentials: 'omit',
    cache: 'no-store',
    headers: { 'Content-Type': contentType },
    body: file,
  });
  if (!putRes.ok) {
    throw Object.assign(new Error('upload-put-failed'), { code: 'upload_put_failed' });
  }

  return { fileKey: presign.fileKey, publicUrl: presign.publicUrl ?? '' };
}

function DocumentSlotCard({
  definition,
  slot,
  busy,
  onSelect,
  onRemove,
}: {
  definition: SlotDefinition;
  slot: DocumentSlot;
  busy: boolean;
  onSelect: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const statusUi = STATUS_UI[slot.status];
  const StatusIcon = statusUi.icon;
  const SlotIcon = definition.icon;

  const openPicker = () => {
    if (busy) return;
    inputRef.current?.click();
  };

  return (
    <section
      className={cn(
        'gpu-layer rounded-2xl border bg-white/5 p-4 backdrop-blur-md',
        slot.error ? 'border-red-500/40' : 'border-border/50'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-orange-500/25 bg-orange-500/10 text-orange-400">
            <SlotIcon className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white">{definition.title}</h4>
            <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">{definition.description}</p>
          </div>
        </div>
        <span
          className={cn(
            'inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold',
            statusUi.tone
          )}
        >
          <StatusIcon
            className={cn('h-3.5 w-3.5', statusUi.spin && 'animate-spin')}
            strokeWidth={2}
          />
          {statusUi.label}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_INPUT_TYPES}
        className="sr-only"
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onSelect(file);
          event.target.value = '';
        }}
      />

      <div className="mt-4">
        <AnimatePresence mode="wait" initial={false}>
          {slot.file ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              className="flex items-center gap-3 rounded-2xl border border-border/60 bg-white/5 p-3 backdrop-blur-md"
            >
              <span className="relative flex h-12 w-12 min-h-12 min-w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-400">
                <FileText className="h-5 w-5" strokeWidth={1.75} />
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-emerald-500/40 bg-[#0a0a0a] text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-white">
                  {slot.file.name}
                </span>
                <span className="mt-0.5 block text-xs text-zinc-500">
                  {describeFileType(slot.file)} · {formatFileSize(slot.file.size)} · anexado
                </span>
              </span>
              <motion.button
                type="button"
                onClick={onRemove}
                disabled={busy}
                aria-label={`Remover ${definition.title}`}
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
              onClick={openPicker}
              onDragOver={(event) => {
                event.preventDefault();
                if (!busy) setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                const file = event.dataTransfer.files?.[0];
                if (file && !busy) onSelect(file);
              }}
              whileHover={!busy ? { scale: 1.01 } : undefined}
              whileTap={!busy ? { scale: 0.985 } : undefined}
              transition={{ type: 'spring', stiffness: 320, damping: 24 }}
              className={cn(
                'group flex min-h-28 w-full flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-7 text-center backdrop-blur-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60 disabled:opacity-60',
                dragging
                  ? 'border-orange-500 bg-orange-500/10'
                  : 'border-border/60 bg-white/5 hover:border-orange-500/70 hover:bg-orange-500/5'
              )}
            >
              <Upload
                className="mb-2 h-6 w-6 text-amber-500 transition-transform duration-300 group-hover:-translate-y-0.5"
                strokeWidth={1.75}
              />
              <span className="text-sm font-semibold text-white">Toque ou arraste para enviar</span>
              <span className="mt-1 text-xs text-zinc-500">{definition.hint}</span>
            </motion.button>
          )}
        </AnimatePresence>

        {slot.error ? (
          <p className="mt-2 text-xs leading-relaxed text-red-400" role="alert">
            {slot.error}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export type ArtistVerificationResult = {
  status: 'aprovado' | 'rejeitado' | 'em_analise';
  role?: 'tatuador' | 'estudio' | 'cliente';
  extractedName?: string;
  confidenceScore?: number;
  erro?: string;
};

export type ProfessionalKycPanelProps = {
  onSubmit?: (submission: ProfessionalDocumentSubmission) => void | Promise<void>;
  onApproved?: (result: ArtistVerificationResult) => void | Promise<void>;
  onRejected?: (reason: string) => void;
};

type AnalysisPhase = 'idle' | 'uploading' | 'analyzing' | 'approved' | 'rejected';

/**
 * Interface de verificação profissional com dois documentos distintos:
 * Documentos Pessoais (RG/CNH) e Comprovação de Habilidade/Diploma.
 *
 * Faz o upload, dispara a verificação por IA e, em caso de aprovação,
 * promove o papel para tatuador no backend.
 */
export function ProfessionalKycPanel({ onSubmit, onApproved, onRejected }: ProfessionalKycPanelProps) {
  const { getToken } = useAuth();
  const { t } = useI18n();
  const { triggerHaptic } = useHapticFeedback();
  const [slots, setSlots] = useState<Record<ProfessionalDocumentKey, DocumentSlot>>(() => ({
    pessoal: { file: null, status: 'pendente', error: null },
    habilidade: { file: null, status: 'pendente', error: null },
  }));
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<AnalysisPhase>('idle');
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [extractedName, setExtractedName] = useState<string | null>(null);

  const handleSelect = useCallback(
    (key: ProfessionalDocumentKey, file: File) => {
      const contentType = resolveUploadContentType(file);
      if (!contentType || !ALLOWED_TYPES.has(contentType)) {
        const message = t('toast.invalidFormat', { formats: FORMAT_HINT });
        setSlots((prev) => ({ ...prev, [key]: { ...prev[key], error: message } }));
        toast.error(message);
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        const message = t('toast.fileTooLarge');
        setSlots((prev) => ({ ...prev, [key]: { ...prev[key], error: message } }));
        toast.error(message);
        return;
      }
      setPhase('idle');
      setRejectionReason(null);
      setSlots((prev) => ({ ...prev, [key]: { file, status: 'enviado', error: null } }));
      triggerHaptic('light');
    },
    [triggerHaptic, t]
  );

  const handleRemove = useCallback(
    (key: ProfessionalDocumentKey) => {
      setPhase('idle');
      setRejectionReason(null);
      setSlots((prev) => ({ ...prev, [key]: { file: null, status: 'pendente', error: null } }));
      triggerHaptic('light');
    },
    [triggerHaptic]
  );

  const bothReady = Boolean(slots.pessoal.file && slots.habilidade.file);
  const allAnalyzing = phase === 'analyzing' || (slots.pessoal.status === 'em_analise' && slots.habilidade.status === 'em_analise');
  const approved = phase === 'approved';
  const rejected = phase === 'rejected';

  const handleConfirm = useCallback(async () => {
    if (busy || !bothReady || allAnalyzing || approved) return;
    setBusy(true);
    setPhase('uploading');
    setRejectionReason(null);
    try {
      const tokenFn = () => getToken({ skipCache: true });
      const submission: ProfessionalDocumentSubmission = {};
      for (const key of ['pessoal', 'habilidade'] as ProfessionalDocumentKey[]) {
        const file = slots[key].file;
        if (!file) continue;
        const uploaded = await uploadDocument(file, tokenFn);
        submission[key] = { ...uploaded, fileName: file.name };
      }

      setSlots((prev) => ({
        pessoal: { ...prev.pessoal, status: 'em_analise', error: null },
        habilidade: { ...prev.habilidade, status: 'em_analise', error: null },
      }));
      setPhase('analyzing');
      triggerHaptic('medium');

      const formData = new FormData();
      if (submission.pessoal?.fileKey) formData.append('pessoalFileKey', submission.pessoal.fileKey);
      if (submission.pessoal?.publicUrl) formData.append('pessoalPublicUrl', submission.pessoal.publicUrl);
      if (submission.pessoal?.fileName) formData.append('pessoalFileName', submission.pessoal.fileName);
      if (submission.habilidade?.fileKey) formData.append('habilidadeFileKey', submission.habilidade.fileKey);
      if (submission.habilidade?.publicUrl) {
        formData.append('habilidadePublicUrl', submission.habilidade.publicUrl);
      }
      if (submission.habilidade?.fileName) {
        formData.append('habilidadeFileName', submission.habilidade.fileName);
      }

      const verifyRes = await authedFetch(
        '/api/artist/verify-ai',
        { method: 'POST', body: formData },
        tokenFn
      );
      const result = (await verifyRes.json().catch(() => ({}))) as {
        sucesso?: boolean;
        isValid?: boolean;
        status?: ArtistVerificationResult['status'];
        role?: ArtistVerificationResult['role'];
        extractedName?: string;
        confidenceScore?: number;
        erro?: string;
      };

      await onSubmit?.(submission);

      if (!verifyRes.ok || !result.sucesso || result.status !== 'aprovado') {
        const reason =
          result.erro || t('toast.docsRejected');
        setPhase('rejected');
        setRejectionReason(reason);
        setSlots((prev) => ({
          pessoal: { ...prev.pessoal, status: 'rejeitado', error: reason },
          habilidade: { ...prev.habilidade, status: 'rejeitado', error: reason },
        }));
        triggerHaptic('heavy');
        toast.error(reason);
        onRejected?.(reason);
        return;
      }

      setExtractedName(result.extractedName || null);
      setPhase('approved');
      setSlots((prev) => ({
        pessoal: { ...prev.pessoal, status: 'aprovado', error: null },
        habilidade: { ...prev.habilidade, status: 'aprovado', error: null },
      }));
      triggerHaptic('success');
      toast.success(t('toast.kycApproved'));
      await onApproved?.({
        status: 'aprovado',
        role: result.role || 'tatuador',
        extractedName: result.extractedName,
        confidenceScore: result.confidenceScore,
      });
    } catch (err) {
      const message = formatAppError(err, 'api');
      setPhase('rejected');
      setRejectionReason(message);
      setSlots((prev) => ({
        pessoal: { ...prev.pessoal, status: 'rejeitado', error: message },
        habilidade: { ...prev.habilidade, status: 'rejeitado', error: message },
      }));
      toast.error(message);
      onRejected?.(message);
    } finally {
      setBusy(false);
    }
  }, [allAnalyzing, approved, bothReady, busy, getToken, onApproved, onRejected, onSubmit, slots, triggerHaptic, t]);

  const controlsLocked = busy || allAnalyzing || approved;

  return (
    <div className="gpu-layer space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-500">
          Verificação profissional
        </p>
        <h3 className="mt-1 text-lg font-bold text-white">Envie seus documentos</h3>
        <p className="mt-1 text-sm leading-relaxed text-zinc-400">
          São necessários dois documentos: identificação pessoal e comprovação de habilidade. Sua
          bancada é liberada somente após a análise.
        </p>
      </header>

      <AnimatePresence mode="wait" initial={false}>
        {approved ? (
          <motion.section
            key="approved"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-300">
              <BadgeCheck className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
              APROVADO
            </p>
            <h4 className="mt-1 text-lg font-bold text-white">Bancada de tatuador liberada</h4>
            <p className="mt-2 text-sm leading-relaxed text-emerald-100/80">
              {extractedName
                ? `Documentos homologados para ${extractedName}. Seu papel agora é TATUADOR.`
                : 'Documentos homologados. Seu papel agora é TATUADOR e o painel do artista está desbloqueado.'}
            </p>
          </motion.section>
        ) : (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-5"
          >
            {SLOTS.map((definition) => (
              <DocumentSlotCard
                key={definition.key}
                definition={definition}
                slot={slots[definition.key]}
                busy={controlsLocked}
                onSelect={(file) => handleSelect(definition.key, file)}
                onRemove={() => handleRemove(definition.key)}
              />
            ))}

            {rejected && rejectionReason ? (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs leading-relaxed text-red-300" role="alert">
                {rejectionReason}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={!bothReady || controlsLocked}
              className={cn(
                'relative flex min-h-12 w-full items-center justify-center overflow-hidden rounded-xl py-3 text-sm font-bold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/70',
                allAnalyzing
                  ? 'border border-sky-500/30 bg-sky-500/10 text-sky-300'
                  : 'bg-orange-500 text-black shadow-[0_0_18px_rgba(249,115,22,0.28)] hover:bg-orange-600 active:scale-95',
                (!bothReady || busy) && !allAnalyzing && 'cursor-not-allowed bg-zinc-700 text-zinc-400 shadow-none'
              )}
            >
              {allAnalyzing ? (
                <motion.span
                  aria-hidden
                  className="absolute inset-0 bg-[linear-gradient(110deg,transparent,rgba(56,189,248,0.18),transparent)]"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
                />
              ) : null}
              <span className="relative z-10 flex items-center gap-2">
                {phase === 'uploading' || (busy && phase !== 'analyzing') ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                    Enviando documentos…
                  </>
                ) : allAnalyzing ? (
                  <>
                    <Sparkles className="h-4 w-4 animate-pulse" strokeWidth={2} />
                    IA analisando documentos...
                  </>
                ) : rejected ? (
                  <>
                    <Upload className="h-4 w-4" strokeWidth={2} />
                    Reenviar documentos
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" strokeWidth={2} />
                    Enviar documentos
                  </>
                )}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="flex items-start gap-2 text-[11px] leading-relaxed text-zinc-500">
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500/80" strokeWidth={1.75} />
        A IA valida autenticidade, metadados e estrutura dos dois documentos. A aprovação promove
        automaticamente o papel para TATUADOR.
      </p>
    </div>
  );
}
