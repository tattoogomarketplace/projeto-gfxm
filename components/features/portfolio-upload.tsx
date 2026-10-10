'use client';

import { useAuth } from '@clerk/nextjs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from '@/lib/toast';
import { ImagePlus, Sparkles, X } from 'lucide-react';
import { NeonButton } from '@/components/ui/neon-button';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { PortfolioCard } from '@/components/features/portfolio-card';
import {
  PortfolioFilterBar,
  type PortfolioHealingFilter,
} from '@/components/features/portfolio-filter-bar';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Skeleton } from '@/components/ui/skeleton';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import {
  PORTFOLIO_BODY_PARTS,
  PORTFOLIO_SESSION_DURATIONS,
  PORTFOLIO_STYLES,
  portfolioLabelResolver,
  type PortfolioBodyPart,
  type PortfolioItemDto,
  type PortfolioSessionDuration,
  type PortfolioStyle,
} from '@/lib/portfolio-metadata';
import { authedFetch } from '@/lib/utils/authed-fetch';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/use-i18n';
import { formatAppError } from '@/lib/error-handler';

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

export function PortfolioUpload({
  tatuadorId,
  artistName = '',
}: {
  tatuadorId: string;
  artistName?: string;
}) {
  void tatuadorId;
  const { getToken } = useAuth();
  const { t } = useI18n();
  const { styleLabel, bodyPartLabel, sessionDurationLabel } = portfolioLabelResolver(t);
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
  const [notes, setNotes] = useState('');
  const [filterStyle, setFilterStyle] = useState('');
  const [filterBodyPart, setFilterBodyPart] = useState('');
  const [filterHealing, setFilterHealing] = useState<PortfolioHealingFilter>('all');

  const canPublish = Boolean(pendingFile && style && bodyPart && sessionDuration);

  const visibleItems = useMemo(
    () =>
      items.filter((item) => {
        if (filterStyle && item.style !== filterStyle) return false;
        if (filterBodyPart && item.bodyPart !== filterBodyPart) return false;
        if (filterHealing === 'fresh' && item.isHealed) return false;
        if (filterHealing === 'healed' && !item.isHealed) return false;
        return true;
      }),
    [items, filterStyle, filterBodyPart, filterHealing]
  );
  const hasFilters = Boolean(filterStyle || filterBodyPart || filterHealing !== 'all');

  const loadItems = useCallback(async () => {
    const res = await authedFetch('/api/tatuador/portfolio', {}, tokenFn);
    const payload = (await res.json().catch(() => ({}))) as {
      sucesso?: boolean;
      items?: PortfolioItemDto[];
      erro?: string;
    };
    if (!res.ok) {
      throw new Error(payload.erro || t('toast.portfolioLoadFailed'));
    }
    setItems(payload.items ?? []);
  }, [tokenFn, t]);

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      try {
        await loadItems();
      } catch (error) {
        if (!cancelled) {
          toast.error(formatAppError(error, 'api'));
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
    setNotes('');
    setModalOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.has(file.type)) {
      toast.error(t('toast.portfolioInvalidType'));
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error(t('toast.fileTooLarge'));
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setChecking(true);
    try {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPendingFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setModalOpen(true);
      toast.success(t('toast.imageReceived'));
    } catch {
      toast.error(t('toast.imagePrepareFailed'));
    } finally {
      setChecking(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const publish = async () => {
    if (!pendingFile || !style || !bodyPart || !sessionDuration) {
      toast.error(t('toast.portfolioFillMeta'));
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
        throw new Error(presign.erro || t('toast.uploadPrepareFailed'));
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
        throw new Error(t('toast.uploadPutFailed'));
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
            notes: notes.trim() || undefined,
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
        throw new Error(payload.erro || t('toast.portfolioPublishFailed'));
      }

      setItems((current) => [payload.item as PortfolioItemDto, ...current]);
      toast.success(t('toast.portfolioPublished'));
      resetDraft();
    } catch (error) {
      toast.error(formatAppError(error, 'api'));
    } finally {
      setPublishing(false);
    }
  };

  const healingOptions = useMemo(
    () => [
      { value: 'fresh' as const, label: t('portfolio.fresh') },
      { value: 'healed' as const, label: t('portfolio.healed') },
    ],
    [t]
  );

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-black/[0.04] bg-white p-5 shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03] dark:shadow-none">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-orange-500/15 blur-3xl"
        />
        <h3 className="relative mb-1 text-sm font-semibold tracking-tight text-neutral-900 dark:text-white">
          {t('portfolio.newPiece')}
        </h3>
        <p className="relative mb-4 max-w-sm text-xs leading-relaxed text-neutral-500 dark:text-zinc-500">
          {t('portfolio.newHint')}
        </p>
        <label className="relative flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 transition-colors hover:border-orange-500 dark:border-white/[0.05] dark:bg-white/[0.04]">
          <ImagePlus className="mb-2 h-5 w-5 text-orange-400" strokeWidth={1.75} />
          <span className="text-sm text-zinc-400">
            {checking ? t('portfolio.checking') : t('portfolio.pickImage')}
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
        <div className="columns-1 gap-4 sm:columns-2">
          <Skeleton className="mb-4 h-80 w-full break-inside-avoid rounded-2xl" />
          <Skeleton className="mb-4 h-64 w-full break-inside-avoid rounded-2xl" />
          <Skeleton className="mb-4 h-56 w-full break-inside-avoid rounded-2xl" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-6 text-center dark:border-white/[0.05] dark:bg-white/[0.03]">
          <p className="text-sm text-neutral-500 dark:text-zinc-400">{t('portfolio.empty')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <PortfolioFilterBar
            style={filterStyle}
            bodyPart={filterBodyPart}
            healed={filterHealing}
            onStyleChange={setFilterStyle}
            onBodyPartChange={setFilterBodyPart}
            onHealingChange={setFilterHealing}
          />

          {visibleItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-6 text-center dark:border-white/[0.05] dark:bg-white/[0.03]">
              <p className="text-sm text-neutral-500 dark:text-zinc-400">
                {t('gallery.emptyFiltered')}
              </p>
            </div>
          ) : (
            <div
              className={cn(
                'columns-1 gap-4 sm:columns-2',
                hasFilters && 'transition-opacity duration-300'
              )}
            >
              {visibleItems.map((item) => (
                <div key={item.id} className="mb-4 break-inside-avoid">
                  <PortfolioCard
                    id={item.id}
                    imageUrl={item.imageUrl}
                    artistName={artistName || t('welcome.artistFallback')}
                    initialLikes={item.likesCount}
                    style={item.style}
                    bodyPart={item.bodyPart}
                    sessionDuration={item.sessionDuration}
                    isHealed={item.isHealed}
                    location={item.location}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {modalOpen ? (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/70 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center">
          <div className="max-h-[min(92vh,calc(100dvh-2rem))] w-full max-w-lg overflow-y-auto overscroll-contain rounded-2xl border border-orange-500/30 bg-white p-5 shadow-[0_0_40px_rgba(249,115,22,0.2)] dark:bg-white/[0.03]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-400">
                  {t('portfolio.curation')}
                </p>
                <h3 className="mt-1 text-lg font-bold text-neutral-900 dark:text-white">{t('portfolio.classify')}</h3>
              </div>
              <button
                type="button"
                onClick={resetDraft}
                disabled={publishing}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-700 text-zinc-400 hover:border-orange-500/40 hover:text-white"
                aria-label={t('common.close')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {previewUrl ? (
              <div className="relative mb-4 h-48 overflow-hidden rounded-xl border border-neutral-800">
                <OptimizedImage src={previewUrl} alt={t('portfolio.preview')} className="h-full w-full" />
              </div>
            ) : null}

            <div className="space-y-5">
              <ChipSelect
                label={t('portfolio.style')}
                values={PORTFOLIO_STYLES}
                value={style}
                onChange={setStyle}
                format={styleLabel}
              />
              <ChipSelect
                label={t('portfolio.bodyPart')}
                values={PORTFOLIO_BODY_PARTS}
                value={bodyPart}
                onChange={setBodyPart}
                format={bodyPartLabel}
              />
              <ChipSelect
                label={t('portfolio.duration')}
                values={PORTFOLIO_SESSION_DURATIONS}
                value={sessionDuration}
                onChange={setSessionDuration}
                format={sessionDurationLabel}
              />

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-400">
                  {t('portfolio.healing')}
                </p>
                <SegmentedControl
                  options={healingOptions}
                  value={healing}
                  onChange={setHealing}
                  ariaLabel={t('portfolio.healing')}
                />
                <p className="text-xs text-zinc-500">
                  {healing === 'healed'
                    ? t('portfolio.healedHint')
                    : t('portfolio.freshHint')}
                </p>
              </div>

              <label className="block space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-400">
                  {t('portfolio.notes')}
                </span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value.slice(0, 180))}
                  rows={3}
                  className="min-h-20 w-full resize-none rounded-xl border border-black/[0.04] bg-neutral-50 px-3 py-2.5 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-orange-500/50 dark:border-white/[0.05] dark:bg-white/[0.04] dark:text-white dark:placeholder:text-zinc-500"
                  placeholder={t('portfolio.notesPlaceholder')}
                />
              </label>
            </div>

            <NeonButton
              className="mt-6 w-full"
              disabled={!canPublish || publishing}
              onClick={() => {
                void publish();
              }}
            >
              {publishing ? (
                <TattooMachineLoader compact label={t('portfolio.publishing')} />
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Sparkles className="h-4 w-4" strokeWidth={1.75} />
                  {t('portfolio.publish')}
                </span>
              )}
            </NeonButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
