'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
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
import type { InspirationItem } from '@/lib/gallery-mock';
import { portfolioLabelResolver } from '@/lib/portfolio-metadata';
import { cn } from '@/lib/utils';

const ASPECTS = ['aspect-[4/5]', 'aspect-square', 'aspect-[3/4]', 'aspect-[4/5]', 'aspect-square'] as const;

const LONG_PRESS_MS = 420;
const LONG_PRESS_MOVE_TOLERANCE = 10;
const CLICK_SUPPRESSION_MS = 800;
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
  layout?: 'masonry' | 'carousel' | 'feed';
  showLike?: boolean;
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
}: GalleryInspirationGridProps) {
  const { t } = useI18n();
  const { styleLabel } = portfolioLabelResolver(t);
  const router = useRouter();
  const { triggerHaptic } = useHapticFeedback();
  const [saved, setSaved] = useState<Record<string, boolean>>({});
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

  const consumeLongPressClick = useCallback(() => {
    if (Date.now() < suppressClickUntil.current) {
      suppressClickUntil.current = 0;
      return true;
    }
    return false;
  }, []);

  const openInspiration = (item: InspirationItem) => {
    triggerHaptic('light');
    router.push(item.artistId ? `/profile/${encodeURIComponent(item.artistId)}` : '/dashboard/galeria');
  };

  const handleInspirationClick = (item: InspirationItem) => {
    if (consumeLongPressClick()) return;
    openInspiration(item);
  };

  const toggleSaved = (id: string) => {
    setSaved((prev) => ({ ...prev, [id]: !prev[id] }));
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
        item.artistId
          ? `/profile/${encodeURIComponent(item.artistId)}`
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
        <div className="flex w-full flex-col gap-6 pb-24" aria-hidden>
          {Array.from({ length: skeletonCount }, (_, index) => (
            <div key={index} className="w-full space-y-3">
              <Skeleton
                className={cn(
                  'w-full rounded-none',
                  index % 2 === 0 ? 'aspect-[4/5]' : 'aspect-square'
                )}
              />
              <div className="flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-11 w-11 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-28 rounded-md" />
                    <Skeleton className="h-3 w-16 rounded-md" />
                  </div>
                </div>
                <Skeleton className="h-11 w-11 rounded-full" />
              </div>
            </div>
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
          isCarousel ? CAROUSEL_CLASS : isFeed ? 'flex w-full flex-col gap-6 pb-24' : 'columns-2 gap-4'
        }
      >
        {items.map((item, index) => {
          const isSaved = Boolean(saved[item.id]);
          const artistName = item.artistName || t('welcome.artistFallback');
          const artistInitial = item.artistInitial || artistName.charAt(0);

          if (isFeed) {
            return (
              <article
                key={item.id}
                onPointerDown={startLongPress(item)}
                onPointerMove={moveLongPress}
                onPointerUp={cancelLongPress}
                onPointerCancel={cancelLongPress}
                onPointerLeave={cancelLongPress}
                onContextMenu={(event) => event.preventDefault()}
                className="w-full select-none"
              >
                <div
                  onPointerUp={handleFeedImagePointerUp(item)}
                  className={cn(
                    'relative w-full overflow-hidden rounded-none bg-zinc-900',
                    index % 2 === 0 ? 'aspect-[4/5]' : 'aspect-square'
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
                      className="h-full w-full"
                    />
                  </motion.div>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />
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
                            className="h-16 w-16 text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.55)]"
                          />
                        </motion.span>
                      ) : null}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 px-4">
                  <button
                    type="button"
                    onClick={() => handleInspirationClick(item)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    aria-label={t('gallery.visitProfile')}
                  >
                    <span className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center overflow-hidden rounded-full border border-orange-500/40 bg-zinc-900 text-sm font-semibold uppercase text-orange-400">
                      {item.artistAvatarUrl ? (
                        <OptimizedImage
                          src={item.artistAvatarUrl}
                          alt={artistName}
                          className="h-full w-full rounded-full"
                        />
                      ) : (
                        artistInitial
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold tracking-tight text-white">
                        {artistName}
                      </span>
                      <span className="mt-0.5 block truncate text-[12px] font-medium text-zinc-400">
                        {styleLabel(item.style)}
                      </span>
                      <span className="mt-1 block text-[11px] font-semibold tracking-wide text-orange-400">
                        {t('gallery.visitProfile')}
                      </span>
                    </span>
                  </button>

                  {showLike ? (
                    <TattooLikeButton
                      key={`${item.id}-${likeBurst?.id === item.id ? likeBurst.nonce : 'idle'}`}
                      liked={isSaved}
                      count={item.likes}
                      onToggle={() => toggleSaved(item.id)}
                      dataGalleryAction
                      ariaLabel={isSaved ? t('aria.unlike') : t('aria.like')}
                      className="pointer-events-auto"
                    />
                  ) : null}
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
              <button
                type="button"
                onClick={() => handleInspirationClick(item)}
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
                    className="pointer-events-auto h-9 w-9 min-h-9 min-w-9 border border-white/15 bg-black/50 p-0 text-white backdrop-blur-md"
                    iconClassName="h-[17px] w-[17px]"
                  />
                ) : null}
              </div>
            </article>
          );
        })}
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
