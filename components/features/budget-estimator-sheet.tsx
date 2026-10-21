'use client';

import { useCallback, useEffect, useState, useSyncExternalStore, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowUpRight, Search, Sparkles, TrendingDown, X } from 'lucide-react';
import {
  createBudgetQuoteRequest,
  getBudgetEstimateAction,
  getCheaperArtistsAction,
} from '@/app/actions/budget';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/hooks/use-i18n';
import { artistProfileHref } from '@/lib/artist-profile';
import type { BudgetEstimateDto, CheaperArtistDto } from '@/lib/services/budget-estimator';
import { toast } from '@/lib/toast';

const subscribe = () => () => {};

const sheetSpring = { type: 'spring', damping: 25, stiffness: 200 } as const;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function RecommendedArtistCard({
  artist,
  pending,
  onQuote,
}: {
  artist: CheaperArtistDto;
  pending: boolean;
  onQuote: (artist: CheaperArtistDto) => void;
}) {
  const thumbnails = artist.thumbnails.slice(0, 3);
  return (
    <article className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-white/10 bg-[#121214] p-4 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <OptimizedImage
            src={artist.avatarUrl}
            alt={artist.name}
            className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{artist.name}</p>
            <p className="truncate text-xs text-zinc-400">
              {artist.location} · {artist.style}
            </p>
            <p className="mt-0.5 truncate text-xs text-zinc-500">{artist.priceRange}</p>
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
          <TrendingDown size={12} strokeWidth={2.5} />
          {artist.savingsLabel}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {thumbnails.length > 0
          ? thumbnails.map((src) => (
              <OptimizedImage
                key={src}
                src={src}
                alt={`Trabalho de ${artist.name}`}
                className="aspect-square h-20 w-full overflow-hidden rounded-lg border border-white/5 bg-zinc-900"
              />
            ))
          : [0, 1, 2].map((slot) => (
              <div
                key={slot}
                className="aspect-square h-20 w-full rounded-lg border border-white/5 bg-zinc-900"
              />
            ))}
      </div>

      <button
        type="button"
        disabled={pending}
        onClick={() => onQuote(artist)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] py-2.5 text-xs font-semibold text-white transition-all duration-300 hover:border-orange-500 hover:bg-orange-500 hover:text-black active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
      >
        Ver Perfil e Cotar
        <ArrowUpRight size={14} strokeWidth={2.5} />
      </button>
    </article>
  );
}

export type BudgetEstimatorItem = {
  id: string;
  style: string;
  artistName: string;
  artistId: string | null;
  artistUsername?: string | null;
  location?: string | null;
  imageUrl?: string | null;
};

type BudgetEstimatorSheetProps = {
  open: boolean;
  item: BudgetEstimatorItem | null;
  onClose: () => void;
  onRequestQuote: (payload: {
    artistId: string;
    artworkId: string;
    estimateRange: string;
  }) => void;
  onQuoteAlternative?: (payload: {
    artistId: string;
    artworkId: string;
    estimateRange: string;
    profileHref: string;
  }) => void;
};

export function BudgetEstimatorSheet({
  open,
  item,
  onClose,
  onRequestQuote,
  onQuoteAlternative,
}: BudgetEstimatorSheetProps) {
  const { t } = useI18n();
  const [showCheaperOptions, setShowCheaperOptions] = useState(false);
  const [estimateState, setEstimateState] = useState<{
    key: string;
    data: BudgetEstimateDto | null;
  }>({ key: '', data: null });
  const [cheaperState, setCheaperState] = useState<{
    key: string;
    artists: CheaperArtistDto[];
  }>({ key: '', artists: [] });
  const [isPending, startTransition] = useTransition();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  const itemKey = item ? `${item.id}:${item.artistId ?? ''}` : '';
  const estimate = estimateState.key === itemKey ? estimateState.data : null;
  const loadingEstimate = Boolean(open && item && estimateState.key !== itemKey);
  const cheaperKey = `${itemKey}:${estimate?.avgPrice ?? ''}:${estimate?.style ?? item?.style ?? ''}`;
  const cheaperArtists = cheaperState.key === cheaperKey ? cheaperState.artists : [];
  const loadingCheaper = Boolean(
    open && showCheaperOptions && item && cheaperState.key !== cheaperKey
  );

  const closeSheet = useCallback(() => {
    setShowCheaperOptions(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open || !item || !itemKey) return;
    let cancelled = false;
    void getBudgetEstimateAction({
      style: item.style,
      location: item.location,
      artistId: item.artistId,
      artworkId: item.id,
      artistName: item.artistName,
    })
      .then((data) => {
        if (!cancelled) setEstimateState({ key: itemKey, data });
      })
      .catch((error) => {
        if (!cancelled) toast.error(error);
      });
    return () => {
      cancelled = true;
    };
  }, [open, item, itemKey]);

  useEffect(() => {
    if (!open || !showCheaperOptions || !item || !cheaperKey) return;
    let cancelled = false;
    void getCheaperArtistsAction({
      styleId: estimate?.style || item.style,
      style: estimate?.style || item.style,
      currentArtistId: estimate?.artistId || item.artistId,
      maxPriceLimit: estimate?.avgPrice ?? null,
      location: estimate?.location || item.location,
    })
      .then((artists) => {
        if (!cancelled) setCheaperState({ key: cheaperKey, artists });
      })
      .catch((error) => {
        if (!cancelled) toast.error(error);
      });
    return () => {
      cancelled = true;
    };
  }, [open, showCheaperOptions, item, estimate, cheaperKey]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (showCheaperOptions) {
        setShowCheaperOptions(false);
        return;
      }
      closeSheet();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, showCheaperOptions, closeSheet]);

  const styleLabel = estimate?.style || item?.style || '—';
  const locationLabel = estimate?.location || item?.location || '—';
  const artistLabel = estimate?.artistName || item?.artistName || '—';
  const rangeLabel = estimate?.rangeLabel || 'R$ 800 - R$ 1.200';
  const primaryArtistId = estimate?.artistId || item?.artistId || '';
  const artworkId = estimate?.artworkId || item?.id || '';

  const startOfficialQuote = () => {
    if (!primaryArtistId || isPending) return;
    startTransition(async () => {
      try {
        if (isUuid(primaryArtistId)) {
          await createBudgetQuoteRequest({
            artistId: primaryArtistId,
            artworkId,
            style: styleLabel,
            estimateRange: rangeLabel,
            imageUrl: item?.imageUrl,
          });
        }
        onRequestQuote({
          artistId: primaryArtistId,
          artworkId,
          estimateRange: rangeLabel,
        });
      } catch (error) {
        toast.error(error);
      }
    });
  };

  const startAlternativeQuote = (artist: CheaperArtistDto) => {
    if (isPending) return;
    const profileHref = artistProfileHref({ id: artist.id, username: artist.username });
    startTransition(async () => {
      try {
        if (isUuid(artist.id)) {
          await createBudgetQuoteRequest({
            artistId: artist.id,
            artworkId,
            style: artist.style || styleLabel,
            estimateRange: artist.priceRange,
            imageUrl: item?.imageUrl,
          });
        }
        if (onQuoteAlternative) {
          onQuoteAlternative({
            artistId: artist.id,
            artworkId,
            estimateRange: artist.priceRange,
            profileHref,
          });
          return;
        }
        onRequestQuote({
          artistId: artist.id,
          artworkId,
          estimateRange: artist.priceRange,
        });
      } catch (error) {
        toast.error(error);
      }
    });
  };

  if (!mounted) return null;

  return createPortal(
    <>
      <AnimatePresence>
        {open ? (
          <motion.div
            key="budget-estimator-root"
            className="fixed inset-0 z-[9998] flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              aria-hidden
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSheet}
            />
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="budget-estimator-title"
              aria-busy={loadingEstimate || isPending}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={sheetSpring}
              onClick={(event) => event.stopPropagation()}
              className="relative w-full max-w-2xl transform-gpu rounded-t-[32px] border-t border-white/10 bg-[#0a0a0c] p-6 pb-[max(2.5rem,calc(2.5rem+env(safe-area-inset-bottom)))] shadow-2xl will-change-transform"
            >
              <span
                aria-hidden
                className="mx-auto mb-6 block h-1.5 w-12 rounded-full bg-white/20"
              />

              <header className="mb-6 flex items-center justify-between gap-3">
                <h2
                  id="budget-estimator-title"
                  className="text-[17px] font-semibold tracking-tight text-zinc-100"
                >
                  Análise de Orçamento
                </h2>
                <button
                  type="button"
                  aria-label={t('common.close')}
                  onClick={closeSheet}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-400 transition-all hover:bg-white/10 hover:text-white"
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
              </header>

              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1">
                  <dt className="text-sm text-zinc-400">Estilo</dt>
                  <dd className="font-medium text-white">{styleLabel}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-sm text-zinc-400">Localização</dt>
                  <dd className="font-medium text-white">{locationLabel}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-sm text-zinc-400">Artista</dt>
                  <dd className="font-medium text-white">{artistLabel}</dd>
                </div>
              </dl>

              <div className="relative mt-6 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 p-5 shadow-inner">
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-orange-500/50 to-transparent"
                />
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="size-4 text-orange-500" />
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-orange-500">
                    Estimativa Inteligente IA
                  </h4>
                </div>
                <p className="mb-5 text-[13px] leading-relaxed text-zinc-400">
                  {estimate?.usedFallback
                    ? 'Ainda há poucos orçamentos históricos para este recorte. Exibimos uma faixa de referência para você seguir com previsibilidade.'
                    : 'Nossa inteligência artificial analisou o mercado para este estilo e região com base em orçamentos reais registrados na plataforma.'}
                </p>
                <div className="flex flex-col items-center justify-center rounded-xl border border-white/5 bg-black/40 p-4">
                  <span className="mb-1 text-xs uppercase tracking-wider text-zinc-500">
                    Média de mercado
                  </span>
                  {loadingEstimate ? (
                    <Skeleton className="h-9 w-48 rounded-lg bg-white/10" />
                  ) : (
                    <span className="text-3xl font-bold tracking-tight text-white">
                      {rangeLabel}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="button"
                  disabled={!primaryArtistId || isPending || loadingEstimate}
                  onClick={startOfficialQuote}
                  className="flex w-full items-center justify-center rounded-xl bg-orange-500 py-3.5 text-[14px] font-bold tracking-wide text-black transition-all hover:bg-orange-400 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
                >
                  Solicitar Orçamento Oficial
                </button>
                <div className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-white/10 via-orange-500/30 to-white/10 p-[1px] transition-all hover:from-white/20 hover:via-orange-500/50 hover:to-white/20">
                  <button
                    type="button"
                    onClick={() => setShowCheaperOptions(true)}
                    className="relative flex w-full items-center justify-center gap-2 rounded-xl bg-[#0a0a0c] py-3.5 text-[14px] font-medium text-zinc-300 transition-all group-hover:bg-zinc-900 active:scale-[0.98]"
                  >
                    <Search size={16} className="text-orange-500" />
                    Encontrar opções mais acessíveis
                  </button>
                </div>
              </div>
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {open && showCheaperOptions ? (
          <motion.div
            key="cheaper-alternatives"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cheaper-alternatives-title"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={sheetSpring}
            className="fixed inset-0 z-[9999] flex h-[100dvh] w-full flex-col bg-[#0a0a0c] transform-gpu will-change-transform"
          >
            <header className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
              <button
                type="button"
                onClick={() => setShowCheaperOptions(false)}
                aria-label={t('common.back')}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-300 transition-all hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft size={18} strokeWidth={2} />
              </button>
              <h2
                id="cheaper-alternatives-title"
                className="min-w-0 flex-1 text-[17px] font-semibold tracking-tight text-zinc-100"
              >
                Opções Acessíveis
              </h2>
              <Sparkles className="size-4 shrink-0 text-orange-500" />
            </header>
            <div className="flex flex-1 flex-col overflow-y-auto p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <div className="mb-5 flex items-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/10 p-3.5 text-xs font-medium text-orange-400">
                <Sparkles className="size-3.5 shrink-0" strokeWidth={2.25} />
                <p>
                  {loadingCheaper
                    ? 'Buscando artistas do mesmo estilo com faixas abaixo da média informada.'
                    : cheaperArtists.length > 0
                      ? `Exibindo ${cheaperArtists.length} artista${cheaperArtists.length === 1 ? '' : 's'} do mesmo estilo com faixas de orçamento abaixo da média informada.`
                      : 'Não encontramos artistas ativos abaixo desta média agora. A estimativa segue disponível para o artista original.'}
                </p>
              </div>
              <div className="flex flex-col gap-4">
                {loadingCheaper
                  ? [0, 1, 2].map((slot) => (
                      <Skeleton
                        key={slot}
                        className="h-56 w-full rounded-2xl border border-white/10 bg-[#121214]"
                      />
                    ))
                  : cheaperArtists.map((artist) => (
                      <RecommendedArtistCard
                        key={artist.id}
                        artist={artist}
                        pending={isPending}
                        onQuote={startAlternativeQuote}
                      />
                    ))}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>,
    document.body
  );
}
