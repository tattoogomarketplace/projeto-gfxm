'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Bookmark, Send } from 'lucide-react';
import {
  GalleryHapticPreview,
  galleryPreviewLayoutId,
  type GalleryPreviewItem,
} from '@/components/features/gallery-haptic-preview';
import { TattooLikeButton, TattooMachineLikeGlyph } from '@/components/ui/tattoo-like-button';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { Skeleton } from '@/components/ui/skeleton';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { CLICK_SUPPRESSION_MS, LONG_PRESS_MS, LONG_PRESS_MOVE_TOLERANCE } from '@/hooks/use-long-press-preview';
import type { InspirationItem } from '@/lib/gallery-mock';
import { portfolioLabelResolver } from '@/lib/portfolio-metadata';
import { artistProfileHref } from '@/lib/artist-profile';
import { cn } from '@/lib/utils';

const ASPECTS = ['aspect-[4/5]', 'aspect-square', 'aspect-[3/4]', 'aspect-[4/5]', 'aspect-square'] as const;

const DOUBLE_TAP_MS = 320;
const LIKE_BURST_MS = 800;

function aspectFor(index: number): string {
  return ASPECTS[index % ASPECTS.length];
}

type GalleryInspirationGridProps = {
  items: InspirationItem[];
  loading?: boolean;
  skeletonCount?: number;
  onExploreStyle?: (style: string) => void;
  onStartConversation?: (tatuadorId: string, artworkId: string) => void;
  layout?: 'masonry' | 'carousel' | 'feed';
  showLike?: boolean;
  actionCard?: ReactNode;
};

const CAROUSEL_CLASS =
  '-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-4 pb-2 [-webkit-overflow-scrolling:touch] scrollbar-none sm:-mx-6 sm:px-6';

export function GalleryInspirationGrid({
  items,
  loading = false,
  skeletonCount = 6,
  onExploreStyle,
  layout = 'masonry',
  showLike = true,
  actionCard,
}: GalleryInspirationGridProps) {
  const { t } = useI18n();
  const { styleLabel } = portfolioLabelResolver(t);
  const router = useRouter();
  const { triggerHaptic } = useHapticFeedback();
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [bookmarked, setBookmarked] = useState<Record<string, boolean>>({});
  const [preview, setPreview] = useState<GalleryPreviewItem | null>(null);
  const [likeBurst, setLikeBurst] = useState<{ id: string; nonce: number } | null>(null);

  const pressTimer = useRef<number | null>(null);
  const pressOrigin = useRef<{ x: number; y: number } | null>(null);
  const suppressClickUntil = useRef(0);
  const lastFeedTap = useRef<{ id: string; at: number } | null>(null);
  const burstTimer = useRef<number | null>(null);

  const cancelLongPress = useCallback(() => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    pressOrigin.current = null;
  }, []);

  useEffect(
    () => () => {
      cancelLongPress();
      if (burstTimer.current !== null) window.clearTimeout(burstTimer.current);
    },
    [cancelLongPress]
  );

  const startLongPress =
    (item: InspirationItem) => (event: ReactPointerEvent<HTMLElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const target = event.target;
      if (target instanceof Element && target.closest('[data-gallery-action]')) return;

      cancelLongPress();
      pressOrigin.current = { x: event.clientX, y: event.clientY };
      pressTimer.current = window.setTimeout(() => {
        pressTimer.current = null;
        pressOrigin.current = null;
        suppressClickUntil.current = Date.now() + CLICK_SUPPRESSION_MS;
        triggerHaptic('medium');
        setPreview(item);
      }, LONG_PRESS_MS);
    };

  const moveLongPress = (event: ReactPointerEvent<HTMLElement>) => {
    const origin = pressOrigin.current;
    if (!origin) return;
    if (
      Math.hypot(event.clientX - origin.x, event.clientY - origin.y) >
      LONG_PRESS_MOVE_TOLERANCE
    ) {
      cancelLongPress();
    }
  };

  const consumeLongPressClick = useCallback((event?: { preventDefault: () => void; stopPropagation: () => void }) => {
    if (Date.now() < suppressClickUntil.current) {
      suppressClickUntil.current = 0;
      event?.preventDefault();
      event?.stopPropagation();
      return true;
    }
    return false;
  }, []);

  const openInspiration = (item: InspirationItem) => {
    triggerHaptic('light');
    router.push(artistProfileHref({ id: item.artistId, username: item.artistUsername }));
  };

  const handleInspirationClick = (
    item: InspirationItem,
    event?: { preventDefault: () => void; stopPropagation: () => void }
  ) => {
    if (consumeLongPressClick(event)) return;
    openInspiration(item);
  };

  const toggleSaved = (id: string) => {
    setSaved((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleBookmarked = (id: string) => {
    setBookmarked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const shareInspiration = (item: InspirationItem) => {
    triggerHaptic('light');
    const href = artistProfileHref({ id: item.artistId, username: item.artistUsername });
    const url = typeof window === 'undefined' ? href : `${window.location.origin}${href}`;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      void navigator.share({ title: item.artistName, url }).catch(() => undefined);
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(url);
    }
  };

  const likeFromDoubleTap = useCallback(
    (id: string) => {
      cancelLongPress();
      setSaved((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
      setLikeBurst((current) => ({
        id,
        nonce: current?.id === id ? current.nonce + 1 : 1,
      }));
      triggerHaptic('heavy');
      if (burstTimer.current !== null) window.clearTimeout(burstTimer.current);
      burstTimer.current = window.setTimeout(() => {
        burstTimer.current = null;
        setLikeBurst((current) => (current?.id === id ? null : current));
      }, LIKE_BURST_MS);
    },
    [cancelLongPress, triggerHaptic]
  );

  const handleFeedImagePointerUp =
    (item: InspirationItem) => (event: ReactPointerEvent<HTMLElement>) => {
      cancelLongPress();
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (Date.now() < suppressClickUntil.current) return;

      const now = Date.now();
      const last = lastFeedTap.current;
      if (last && last.id === item.id && now - last.at <= DOUBLE_TAP_MS) {
        lastFeedTap.current = null;
        likeFromDoubleTap(item.id);
        return;
      }
      lastFeedTap.current = { id: item.id, at: now };
    };

  const dismissPreview = useCallback(() => setPreview(null), []);

  const visitPreviewProfile = useCallback(
    (item: GalleryPreviewItem) => {
      setPreview(null);
      triggerHaptic('light');
      router.push(
        item.artistId || item.artistUsername
          ? artistProfileHref({ id: item.artistId, username: item.artistUsername })
          : '/dashboard/galeria'
      );
    },
    [router, triggerHaptic]
  );

  const explorePreviewStyles = useCallback(
    (item: GalleryPreviewItem) => {
      setPreview(null);
      triggerHaptic('light');
      onExploreStyle?.(item.style || '');
    },
    [onExploreStyle, triggerHaptic]
  );

  const isCarousel = layout === 'carousel';
  const isFeed = layout === 'feed';

  if (loading) {
    if (isCarousel) {
      return (
        <div className={CAROUSEL_CLASS} aria-hidden>
          {Array.from({ length: Math.min(skeletonCount, 6) }, (_, index) => (
            <Skeleton
              key={index}
              className="h-[15.5rem] w-[11.5rem] shrink-0 snap-start rounded-xl"
            />
          ))}
        </div>
      );
    }
    if (isFeed) {
      return (
        <div className="flex w-full max-w-none flex-col px-0 mx-0 pb-[calc(env(safe-area-inset-bottom)+8rem)]" aria-hidden>
          {Array.from({ length: skeletonCount }, (_, index) => (
            <article
              key={index}
                className="flex flex-col w-full max-w-none relative mb-8 px-0 mx-0"
            >
              <div className="flex items-center justify-between px-4 py-3 w-full bg-transparent">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full object-cover ring-1 ring-white/10" />
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-2.5 w-20" />
                  </div>
                </div>
                <Skeleton className="h-7 w-[5.5rem] rounded-full border border-orange-500/30 bg-orange-500/5 shadow-[0_0_10px_rgba(249,115,22,0.05)]" />
              </div>
              <Skeleton className="w-full max-w-none aspect-[4/5] relative bg-[#050505] rounded-none border-l-0 border-r-0 px-0 mx-0 mb-0" />
              <div className="w-full max-w-none mt-0 px-0 mx-0 bg-zinc-900/90 supports-[backdrop-filter]:bg-zinc-900/60 backdrop-blur-2xl border-y border-white/[0.04] border-l-0 border-r-0 rounded-none">
                <div className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-8">
                    <Skeleton className="flex items-center justify-center w-10 h-10 rounded-xl border border-white/10 bg-white/[0.02]" />
                    <Skeleton className="flex items-center justify-center w-10 h-10 rounded-xl border border-white/10 bg-white/[0.02]" />
                  </div>
                  <Skeleton className="flex items-center justify-center w-10 h-10 rounded-xl border border-white/10 bg-white/[0.02]" />
                </div>
              </div>
              <div className="bg-[#0a0a0c] border border-white/[0.04] rounded-[20px] p-4 mx-4 mt-2 mb-4 flex flex-col gap-1.5">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-3 w-full" />
              </div>
              <div className="w-full h-16 flex items-center justify-center gap-1.5 opacity-80 mb-6 mt-2">
                <div className="w-[1px] h-3 bg-zinc-700"></div>
                <div className="w-[2px] h-5 bg-orange-600 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.6)]"></div>
                <div className="w-[1px] h-3 bg-zinc-700"></div>
                <div className="flex-1 max-w-[120px] h-[1px] bg-gradient-to-r from-orange-500/50 via-zinc-800 to-transparent mx-3"></div>
              </div>
            </article>
          ))}
        </div>
      );
    }
    return (
      <div className="columns-2 gap-4" aria-hidden>
        {Array.from({ length: skeletonCount }, (_, index) => (
          <Skeleton
            key={index}
            className={cn('mb-4 w-full break-inside-avoid rounded-xl', aspectFor(index))}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <div
        className={
          isCarousel ? CAROUSEL_CLASS : isFeed ? 'flex w-full max-w-none flex-col px-0 mx-0 pb-[calc(env(safe-area-inset-bottom)+8rem)]' : 'columns-2 gap-4'
        }
      >
        {items.map((item, index) => {
          const isSaved = Boolean(saved[item.id]);
          const artistName = item.artistName || t('welcome.artistFallback');

          if (isFeed) {
            const artistInitial = item.artistInitial || artistName.charAt(0) || 'A';
            const profileHref = artistProfileHref({
              id: item.artistId,
              username: item.artistUsername,
            });
            const metaLine = [styleLabel(item.style), item.location].filter(Boolean).join(' · ');
            const likeCount = item.likes + (isSaved ? 1 : 0);
            const likeLabel = `Curtido por ${likeCount.toLocaleString('pt-BR')} pessoas`;
            const caption =
              item.description?.trim() ||
              `${styleLabel(item.style)} disponível para orçamento.`;
            const isBookmarked = Boolean(bookmarked[item.id]);

            return (
              <article
                key={item.id}
                onPointerDown={startLongPress(item)}
                onPointerMove={moveLongPress}
                onPointerUp={cancelLongPress}
                onPointerCancel={cancelLongPress}
                onPointerLeave={cancelLongPress}
                onContextMenu={(event) => event.preventDefault()}
              className="flex flex-col w-full max-w-none relative mb-8 px-0 mx-0"
              >
                <div className="flex items-center justify-between px-4 py-3 w-full bg-transparent">
                  <div className="flex min-w-0 items-center gap-3">
                    {item.artistAvatarUrl ? (
                      <OptimizedImage
                        src={item.artistAvatarUrl}
                        alt={artistName}
                        className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-white/10"
                      />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold uppercase text-zinc-100 ring-1 ring-white/10">
                        {artistInitial}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-zinc-100">
                        {artistName}
                      </p>
                      {metaLine ? (
                        <p className="truncate text-xs text-zinc-400">{metaLine}</p>
                      ) : null}
                    </div>
                  </div>
                  <Link
                    href={profileHref}
                    data-gallery-action=""
                    className="shrink-0 px-4 py-1.5 rounded-full border border-orange-500/30 text-orange-500 font-bold text-xs uppercase bg-orange-500/5 shadow-[0_0_10px_rgba(249,115,22,0.05)]"
                  >
                    VISITAR
                  </Link>
                </div>

                <div
                  onPointerUp={handleFeedImagePointerUp(item)}
                  className="w-full max-w-none aspect-[4/5] relative bg-[#050505] rounded-none border-l-0 border-r-0 px-0 mx-0 mb-0"
                >
                    <motion.div
                      layout="position"
                      layoutId={galleryPreviewLayoutId(item.id)}
                      transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.8 }}
                      style={{ backfaceVisibility: 'hidden' }}
                      className="absolute inset-0 transform-gpu will-change-transform [backface-visibility:hidden] [transform:translateZ(0)]"
                    >
                      <OptimizedImage
                        src={item.imageUrl}
                        alt={`${styleLabel(item.style)} — ${artistName}`}
                        className="object-cover w-full h-full"
                      />
                    </motion.div>
                    <div className="pointer-events-none absolute inset-0 z-[3] flex items-center justify-center">
                      <AnimatePresence>
                        {likeBurst?.id === item.id ? (
                          <motion.span
                            key={likeBurst.nonce}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: [0, 1.2, 1], opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                            className="flex h-24 w-24 items-center justify-center rounded-full bg-black/25 backdrop-blur-md transform-gpu will-change-transform [backface-visibility:hidden] [transform:translateZ(0)]"
                            style={{ backfaceVisibility: 'hidden' }}
                          >
                            <TattooMachineLikeGlyph
                              liked
                              className="h-16 w-16 text-orange-500 drop-shadow-[0_8px_24px_rgba(0,0,0,0.55)]"
                            />
                          </motion.span>
                        ) : null}
                      </AnimatePresence>
                    </div>
                  </div>

                <div className="w-full max-w-none mt-0 px-0 mx-0 bg-zinc-900/90 supports-[backdrop-filter]:bg-zinc-900/60 backdrop-blur-2xl border-y border-white/[0.04] border-l-0 border-r-0 rounded-none">
                  <div className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-8">
                    {showLike ? (
                      <button
                        type="button"
                        data-gallery-action=""
                        onClick={() => {
                          triggerHaptic('light');
                          toggleSaved(item.id);
                        }}
                        className={cn(
                          'flex items-center justify-center w-10 h-10 rounded-xl border border-white/10 bg-white/[0.02] text-zinc-300 hover:border-orange-500/50 transition-all',
                          isSaved && 'text-orange-500 border-orange-500/50'
                        )}
                        aria-label={isSaved ? t('aria.unlike') : t('aria.like')}
                        aria-pressed={isSaved}
                      >
                        <TattooMachineLikeGlyph liked={isSaved} className="h-6 w-6" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      data-gallery-action=""
                      onClick={() => shareInspiration(item)}
                      className="flex items-center justify-center w-10 h-10 rounded-xl border border-white/10 bg-white/[0.02] text-zinc-300 hover:border-orange-500/50 transition-all"
                      aria-label="Compartilhar"
                    >
                      <Send className="h-6 w-6" strokeWidth={2} />
                    </button>
                  </div>
                  <button
                    type="button"
                    data-gallery-action=""
                    onClick={() => {
                      triggerHaptic('light');
                      toggleBookmarked(item.id);
                    }}
                    className={cn(
                      'flex items-center justify-center w-10 h-10 rounded-xl border border-white/10 bg-white/[0.02] text-zinc-300 hover:border-orange-500/50 transition-all',
                      isBookmarked && 'text-orange-500 border-orange-500/50'
                    )}
                    aria-label="Salvar"
                    aria-pressed={isBookmarked}
                  >
                    <Bookmark
                      className="h-6 w-6"
                      strokeWidth={2}
                      fill={isBookmarked ? 'currentColor' : 'none'}
                    />
                  </button>
                  </div>
                </div>

                <div className="bg-[#0a0a0c] border border-white/[0.04] rounded-[20px] p-4 mx-4 mt-2 mb-4 flex flex-col gap-1.5">
                  <p className="text-[13px] font-semibold text-zinc-100 tracking-wide">{likeLabel}</p>
                  <p className="text-[13px] leading-relaxed">
                    <span className="font-bold text-zinc-100 mr-2">
                      {artistName}
                    </span>
                    <span className="text-[13px] text-zinc-400 font-light leading-relaxed">{caption}</span>
                  </p>
                </div>
                <div className="w-full h-16 flex items-center justify-center gap-1.5 opacity-80 mb-6 mt-2">
                  <div className="w-[1px] h-3 bg-zinc-700"></div>
                  <div className="w-[2px] h-5 bg-orange-600 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.6)]"></div>
                  <div className="w-[1px] h-3 bg-zinc-700"></div>
                  <div className="flex-1 max-w-[120px] h-[1px] bg-gradient-to-r from-orange-500/50 via-zinc-800 to-transparent mx-3"></div>
                </div>
              </article>
            );
          }

          return (
            <article
              key={item.id}
              onPointerDown={startLongPress(item)}
              onPointerMove={moveLongPress}
              onPointerUp={cancelLongPress}
              onPointerCancel={cancelLongPress}
              onPointerLeave={cancelLongPress}
              onContextMenu={(event) => event.preventDefault()}
              className={cn(
                'group relative select-none overflow-hidden rounded-xl border border-zinc-800/50 bg-zinc-900/40',
                isCarousel
                  ? 'h-[15.5rem] w-[11.5rem] shrink-0 snap-start'
                  : cn('mb-4 break-inside-avoid', aspectFor(index))
              )}
            >
              <motion.div
                layout="position"
                layoutId={galleryPreviewLayoutId(item.id)}
                transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.8 }}
                style={{ backfaceVisibility: 'hidden' }}
                className="absolute inset-0 transform-gpu will-change-transform [backface-visibility:hidden] [transform:translateZ(0)]"
              >
                <OptimizedImage
                  src={item.imageUrl}
                  alt={`${styleLabel(item.style)} — ${artistName}`}
                  className="h-full w-full transition-transform duration-500 group-hover:scale-[1.04]"
                />
              </motion.div>
              {isCarousel ? (
                <>
                  <button
                    type="button"
                    onClick={(event) => handleInspirationClick(item, event)}
                    className="absolute inset-0 z-[1]"
                    aria-label={artistName}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 z-[2] flex items-end justify-between gap-2 p-3">
                    <div className="pointer-events-none min-w-0">
                      <p className="truncate text-[13px] font-semibold text-white">{artistName}</p>
                      <p className="truncate text-[11px] text-zinc-300/90">{styleLabel(item.style)}</p>
                    </div>
                    {showLike ? (
                      <TattooLikeButton
                        liked={isSaved}
                        onToggle={() => toggleSaved(item.id)}
                        showCount={false}
                        dataGalleryAction
                        ariaLabel={isSaved ? t('aria.unlike') : t('aria.like')}
                        className="pointer-events-auto h-10 w-10 min-h-10 min-w-10 border border-orange-500/40 bg-black/55 p-0 text-orange-500 backdrop-blur-md"
                        iconClassName="h-[18px] w-[18px]"
                      />
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  {showLike ? (
                    <div className="absolute right-3 top-3 z-[5]">
                      <TattooLikeButton
                        liked={isSaved}
                        onToggle={() => toggleSaved(item.id)}
                        showCount={false}
                        dataGalleryAction
                        ariaLabel={isSaved ? t('aria.unlike') : t('aria.like')}
                        className="h-11 w-11 min-h-11 min-w-11 border border-orange-500/40 bg-black/55 p-0 text-orange-500 shadow-[0_0_18px_rgba(249,115,22,0.28)] backdrop-blur-md"
                        iconClassName="h-5 w-5"
                      />
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={(event) => handleInspirationClick(item, event)}
                    className="absolute bottom-3 right-3 z-[5] rounded-full border border-orange-500/40 bg-orange-500/15 px-4 py-2 text-sm font-semibold text-orange-400 backdrop-blur-md"
                    aria-label={t('gallery.visitProfile')}
                  >
                    {t('gallery.visitProfile')}
                  </button>
                </>
              )}
            </article>
          );
        })}
        {isCarousel ? actionCard : null}
      </div>

      <GalleryHapticPreview
        item={preview}
        onDismiss={dismissPreview}
        onVisitProfile={visitPreviewProfile}
        onExploreStyles={explorePreviewStyles}
        showLike={showLike}
      />
    </>
  );
}
