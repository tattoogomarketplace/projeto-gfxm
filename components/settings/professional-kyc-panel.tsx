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
  Upload,
  X,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { authedFetch } from '@/lib/utils/authed-fetch';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { cn } from '@/lib/utils';

export type ProfessionalDocumentStatus = 'pendente' | 'enviado' | 'em_analise';

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
    throw new Error(presign.erro || 'Não foi possível preparar o upload.');
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
  if (!putRes.ok) throw new Error('Falha ao enviar o arquivo. Tente novamente.');

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
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-emerald-500/40 bg-[#121212] text-emerald-400">
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

export type ProfessionalKycPanelProps = {
  onSubmit?: (submission: ProfessionalDocumentSubmission) => void | Promise<void>;
};

/**
 * Interface de verificação profissional com dois documentos distintos:
 * Documentos Pessoais (RG/CNH) e Comprovação de Habilidade/Diploma.
 *
 * Realiza apenas o upload para o storage e o controle de estado local. Não
 * altera o papel do usuário nem o status de verificação no banco — a análise
 * por IA e a promoção de papel ficam a cargo da etapa seguinte (Parte 3).
 */
export function ProfessionalKycPanel({ onSubmit }: ProfessionalKycPanelProps) {
  const { getToken } = useAuth();
  const { triggerHaptic } = useHapticFeedback();
  const [slots, setSlots] = useState<Record<ProfessionalDocumentKey, DocumentSlot>>(() => ({
    pessoal: { file: null, status: 'pendente', error: null },
    habilidade: { file: null, status: 'pendente', error: null },
  }));
  const [busy, setBusy] = useState(false);

  const handleSelect = useCallback(
    (key: ProfessionalDocumentKey, file: File) => {
      const contentType = resolveUploadContentType(file);
      if (!contentType || !ALLOWED_TYPES.has(contentType)) {
        const message = `Formato inválido. Envie ${FORMAT_HINT}.`;
        setSlots((prev) => ({ ...prev, [key]: { ...prev[key], error: message } }));
        toast.error(message);
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        const message = 'Arquivo acima de 10 MB.';
        setSlots((prev) => ({ ...prev, [key]: { ...prev[key], error: message } }));
        toast.error(message);
        return;
      }
      setSlots((prev) => ({ ...prev, [key]: { file, status: 'enviado', error: null } }));
      triggerHaptic('light');
    },
    [triggerHaptic]
  );

  const handleRemove = useCallback(
    (key: ProfessionalDocumentKey) => {
      setSlots((prev) => ({ ...prev, [key]: { file: null, status: 'pendente', error: null } }));
      triggerHaptic('light');
    },
    [triggerHaptic]
  );

  const bothReady = Boolean(slots.pessoal.file && slots.habilidade.file);
  const allAnalyzing = slots.pessoal.status === 'em_analise' && slots.habilidade.status === 'em_analise';

  const handleConfirm = useCallback(async () => {
    if (busy || !bothReady || allAnalyzing) return;
    setBusy(true);
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
        pessoal: { ...prev.pessoal, status: 'em_analise' },
        habilidade: { ...prev.habilidade, status: 'em_analise' },
      }));
      triggerHaptic('success');
      toast.success('Documentos enviados para análise.');
      await onSubmit?.(submission);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao enviar os documentos.');
    } finally {
      setBusy(false);
    }
  }, [allAnalyzing, bothReady, busy, getToken, onSubmit, slots, triggerHaptic]);

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

      {SLOTS.map((definition) => (
        <DocumentSlotCard
          key={definition.key}
          definition={definition}
          slot={slots[definition.key]}
          busy={busy}
          onSelect={(file) => handleSelect(definition.key, file)}
          onRemove={() => handleRemove(definition.key)}
        />
      ))}

      <button
        type="button"
        onClick={() => void handleConfirm()}
        disabled={!bothReady || busy || allAnalyzing}
        className={cn(
          'flex min-h-12 w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/70',
          allAnalyzing
            ? 'border border-sky-500/30 bg-sky-500/10 text-sky-300'
            : 'bg-orange-500 text-black shadow-[0_0_18px_rgba(249,115,22,0.28)] hover:bg-orange-600 active:scale-95',
          (!bothReady || busy) && !allAnalyzing && 'cursor-not-allowed bg-zinc-700 text-zinc-400 shadow-none'
        )}
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
            Enviando documentos…
          </>
        ) : allAnalyzing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
            Documentos em análise
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" strokeWidth={2} />
            Confirmar envio
          </>
        )}
      </button>

      <p className="flex items-start gap-2 text-[11px] leading-relaxed text-zinc-500">
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500/80" strokeWidth={1.75} />
        A análise por IA e a promoção de papel acontecem na etapa seguinte. Nesta etapa você
        permanece um usuário padrão.
      </p>
    </div>
  );
}
