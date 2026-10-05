'use client';

import { useAuth } from '@clerk/nextjs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Clock3, ImagePlus, MapPin, Sparkles, X } from 'lucide-react';
import { moderateImageWithGemini } from '@/lib/ai-moderation';
import { NeonButton } from '@/components/ui/neon-button';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Skeleton } from '@/components/ui/skeleton';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import {
  PORTFOLIO_BODY_PARTS,
  PORTFOLIO_SESSION_DURATIONS,
  PORTFOLIO_STYLES,
  bodyPartLabel,
  healingLabel,
  sessionDurationLabel,
  styleLabel,
  type PortfolioBodyPart,
  type PortfolioItemDto,
  type PortfolioSessionDuration,
  type PortfolioStyle,
} from '@/lib/portfolio-metadata';
import { authedFetch } from '@/lib/utils/authed-fetch';
import { cn } from '@/lib/utils';

const SAFETY_MESSAGE =
  'Conteúdo impróprio detectado. Upload bloqueado por violação das diretrizes.';
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif']);

type HealingStatus = 'fresh' | 'healed';

function ChipSelect<T extends string>({
  label,
  values,
  value,
  onChange,
  format,
}: {
  label: string;
  values: readonly T[];
  value: T | '';
  onChange: (next: T) => void;
  format: (item: T) => string;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-400">
        {label}
      </legend>
      <div className="flex flex-wrap gap-2">
        {values.map((item) => {
          const selected = item === value;
          return (
            <button
              key={item}
              type="button"
              onClick={() => onChange(item)}
              className={cn(
                'min-h-11 rounded-full border px-3 py-2 text-xs font-semibold transition-all active:scale-95',
                selected
                  ? 'border-orange-500 bg-orange-500/15 text-orange-300 shadow-[0_0_16px_rgba(249,115,22,0.28)]'
                  : 'border-neutral-700 bg-[#161616] text-zinc-400 hover:border-orange-500/40 hover:text-zinc-200'
              )}
            >
              {format(item)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function PortfolioUpload({ tatuadorId }: { tatuadorId: string }) {
  void tatuadorId;
  const { getToken } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tokenFn = useCallback(() => getToken({ skipCache: true }), [getToken]);

  const [items, setItems] = useState<PortfolioItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [style, setStyle] = useState<PortfolioStyle | ''>('');
  const [bodyPart, setBodyPart] = useState<PortfolioBodyPart | ''>('');
  const [sessionDuration, setSessionDuration] = useState<PortfolioSessionDuration | ''>('');
  const [healing, setHealing] = useState<HealingStatus>('fresh');

  const canPublish = Boolean(pendingFile && style && bodyPart && sessionDuration);

  const loadItems = useCallback(async () => {
    const res = await authedFetch('/api/tatuador/portfolio', {}, tokenFn);
    const payload = (await res.json().catch(() => ({}))) as {
      sucesso?: boolean;
      items?: PortfolioItemDto[];
      erro?: string;
    };
    if (!res.ok) {
      throw new Error(payload.erro || 'Falha ao carregar o portfólio.');
    }
    setItems(payload.items ?? []);
  }, [tokenFn]);

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      try {
        await loadItems();
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Falha ao carregar o portfólio.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void boot();
    return () => {
      cancelled = true;
    };
  }, [loadItems]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const resetDraft = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPendingFile(null);
    setStyle('');
    setBodyPart('');
    setSessionDuration('');
    setHealing('fresh');
    setModalOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.has(file.type)) {
      toast.error('Envie uma imagem JPG, PNG, WEBP ou AVIF.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error('Arquivo acima de 10 MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setChecking(true);
    try {
      const reader = new FileReader();
      const base64String = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          const encoded = result?.split(',')[1];
          if (!encoded) {
            reject(new Error(SAFETY_MESSAGE));
            return;
          }
          resolve(encoded);
        };
        reader.onerror = () => reject(new Error(SAFETY_MESSAGE));
        reader.readAsDataURL(file);
      });

      const isSafe = await moderateImageWithGemini(base64String);
      if (!isSafe) {
        toast.error(SAFETY_MESSAGE);
        return;
      }

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPendingFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setModalOpen(true);
      toast.success('Imagem aprovada. Classifique a peça para publicar.');
    } catch {
      toast.error(SAFETY_MESSAGE);
    } finally {
      setChecking(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const publish = async () => {
    if (!pendingFile || !style || !bodyPart || !sessionDuration) {
      toast.error('Preencha estilo, parte do corpo, duração e status de cicatrização.');
      return;
    }

    setPublishing(true);
    try {
      const contentType = pendingFile.type === 'image/jpg' ? 'image/jpeg' : pendingFile.type;
      const presignRes = await authedFetch(
        '/api/upload/presign',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: pendingFile.name, contentType }),
        },
        tokenFn
      );
      const presign = (await presignRes.json().catch(() => ({}))) as {
        presignedUrl?: string;
        publicUrl?: string;
        erro?: string;
      };
      if (!presignRes.ok || !presign.presignedUrl || !presign.publicUrl) {
        throw new Error(presign.erro || 'Não foi possível preparar o upload.');
      }

      const putRes = await fetch(presign.presignedUrl, {
        method: 'PUT',
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store',
        headers: { 'Content-Type': contentType },
        body: pendingFile,
      });
      if (!putRes.ok) {
        throw new Error('Falha ao enviar a imagem para o storage.');
      }

      const publishRes = await authedFetch(
        '/api/tatuador/portfolio',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: presign.publicUrl,
            style,
            bodyPart,
            sessionDuration,
            isHealed: healing === 'healed',
          }),
        },
        tokenFn
      );
      const payload = (await publishRes.json().catch(() => ({}))) as {
        sucesso?: boolean;
        item?: PortfolioItemDto;
        erro?: string;
      };
      if (!publishRes.ok || !payload.item) {
        throw new Error(payload.erro || 'Publicação recusada. Complete todos os metadados.');
      }

      setItems((current) => [payload.item as PortfolioItemDto, ...current]);
      toast.success('Peça publicada na Galeria de Inspirações.');
      resetDraft();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao publicar o portfólio.');
    } finally {
      setPublishing(false);
    }
  };

  const healingOptions = useMemo(
    () => [
      { value: 'fresh' as const, label: 'Recém-feita' },
      { value: 'healed' as const, label: 'Cicatrizada' },
    ],
    []
  );

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-[#121212] p-6 shadow-[0_0_40px_rgba(249,115,22,0.08)]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-orange-500/15 blur-3xl"
        />
        <h2 className="relative mb-1 font-bold text-orange-400">Novo Post no Portfólio</h2>
        <p className="relative mb-4 max-w-sm text-sm text-zinc-400">
          Toda peça precisa de estilo, parte do corpo, duração e status de cicatrização antes de
          entrar na Galeria de Inspirações.
        </p>
        <label className="relative flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-700 bg-[#161616] transition-colors hover:border-orange-500">
          <ImagePlus className="mb-2 h-5 w-5 text-orange-400" strokeWidth={1.75} />
          <span className="text-sm text-zinc-400">
            {checking ? 'Verificando conteúdo...' : 'Tirar foto ou escolher da galeria'}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            capture="environment"
            className="hidden"
            onChange={handleUpload}
            disabled={checking || publishing}
          />
        </label>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-800 bg-[#121212] p-6 text-center">
          <p className="text-sm text-zinc-400">Nenhuma peça publicada ainda.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="overflow-hidden rounded-2xl border border-neutral-800 bg-[#121212]"
            >
              <div className="relative h-40 w-full overflow-hidden">
                <OptimizedImage src={item.imageUrl} alt={styleLabel(item.style)} className="h-full w-full" />
              </div>
              <div className="space-y-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-white">{styleLabel(item.style)}</span>
                  <span
                    className={cn(
                      'rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide',
                      item.isHealed
                        ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300'
                        : 'border-orange-500/40 bg-orange-500/10 text-orange-300'
                    )}
                  >
                    {healingLabel(item.isHealed)}
                  </span>
                </div>
                <p className="flex items-center gap-1 text-xs text-zinc-400">
                  <MapPin className="h-3 w-3" strokeWidth={1.75} />
                  {bodyPartLabel(item.bodyPart)}
                  <Clock3 className="ml-2 h-3 w-3" strokeWidth={1.75} />
                  {sessionDurationLabel(item.sessionDuration)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {modalOpen ? (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-orange-500/30 bg-[#121212] p-5 shadow-[0_0_40px_rgba(249,115,22,0.2)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-400">
                  Curadoria
                </p>
                <h3 className="mt-1 text-lg font-bold text-white">Classificar peça</h3>
              </div>
              <button
                type="button"
                onClick={resetDraft}
                disabled={publishing}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-700 text-zinc-400 hover:border-orange-500/40 hover:text-white"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {previewUrl ? (
              <div className="relative mb-4 h-48 overflow-hidden rounded-xl border border-neutral-800">
                <OptimizedImage src={previewUrl} alt="Pré-visualização" className="h-full w-full" />
              </div>
            ) : null}

            <div className="space-y-5">
              <ChipSelect
                label="Estilo"
                values={PORTFOLIO_STYLES}
                value={style}
                onChange={setStyle}
                format={styleLabel}
              />
              <ChipSelect
                label="Parte do corpo"
                values={PORTFOLIO_BODY_PARTS}
                value={bodyPart}
                onChange={setBodyPart}
                format={bodyPartLabel}
              />
              <ChipSelect
                label="Duração da sessão"
                values={PORTFOLIO_SESSION_DURATIONS}
                value={sessionDuration}
                onChange={setSessionDuration}
                format={sessionDurationLabel}
              />

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-400">
                  Status de cicatrização
                </p>
                <SegmentedControl
                  options={healingOptions}
                  value={healing}
                  onChange={setHealing}
                  ariaLabel="Status de cicatrização"
                />
                <p className="text-xs text-zinc-500">
                  {healing === 'healed'
                    ? 'Cicatrizada: a peça já passou pelo processo de cura.'
                    : 'Recém-feita: sessão recente, ainda em processo de cicatrização.'}
                </p>
              </div>
            </div>

            <NeonButton
              className="mt-6 w-full"
              disabled={!canPublish || publishing}
              onClick={() => {
                void publish();
              }}
            >
              {publishing ? (
                <TattooMachineLoader compact label="Publicando" />
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Sparkles className="h-4 w-4" strokeWidth={1.75} />
                  Publicar na galeria
                </span>
              )}
            </NeonButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
