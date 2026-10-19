'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  GalleryHapticPreview,
  galleryPreviewLayoutId,
  type GalleryPreviewItem,
} from '@/components/features/gallery-haptic-preview';
import { TattooLikeButton } from '@/components/ui/tattoo-like-button';
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

function aspectFor(index: number): string {
  return ASPECTS[index % ASPECTS.length];
}

type GalleryInspirationGridProps = {
  items: InspirationItem[];
  loading?: boolean;
  skeletonCount?: number;
  onExploreStyle?: (style: string) => void;
};

export function GalleryInspirationGrid({
  items,
  loading = false,
  skeletonCount = 6,
  onExploreStyle,
}: GalleryInspirationGridProps) {
  const { t } = useI18n();
  const { styleLabel } = portfolioLabelResolver(t);
  const router = useRouter();
  const { triggerHaptic } = useHapticFeedback();
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [preview, setPreview] = useState<GalleryPreviewItem | null>(null);

  const pressTimer = useRef<number | null>(null);
  const pressOrigin = useRef<{ x: number; y: number } | null>(null);
  const suppressClickUntil = useRef(0);

  const cancelLongPress = useCallback(() => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    pressOrigin.current = null;
  }, []);

  useEffect(() => cancelLongPress, [cancelLongPress]);

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

  if (loading) {
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
      <div className="columns-2 gap-4">
        {items.map((item, index) => {
          const isSaved = Boolean(saved[item.id]);
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
                'group relative mb-4 select-none break-inside-avoid overflow-hidden rounded-xl border border-zinc-800/50 bg-zinc-900/40',
                aspectFor(index)
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
                  alt={`${styleLabel(item.style)} — ${item.artistName || t('welcome.artistFallback')}`}
                  className="h-full w-full transition-transform duration-500 group-hover:scale-[1.04]"
                />
              </motion.div>
              <button
                type="button"
                onClick={() => handleInspirationClick(item)}
                className="absolute inset-0 z-[1]"
                aria-label={item.artistName || t('welcome.artistFallback')}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 z-[2] flex items-end justify-between gap-2 p-3">
                <div className="pointer-events-none min-w-0">
                  <p className="truncate text-[13px] font-semibold text-white">
                    {item.artistName || t('welcome.artistFallback')}
                  </p>
                  <p className="truncate text-[11px] text-zinc-300/90">
                    {styleLabel(item.style)}
                  </p>
                </div>
                <TattooLikeButton
                  liked={isSaved}
                  onToggle={() => toggleSaved(item.id)}
                  showCount={false}
                  dataGalleryAction
                  ariaLabel={isSaved ? t('aria.unlike') : t('aria.like')}
                  className="pointer-events-auto h-9 w-9 min-h-9 min-w-9 border border-white/15 bg-black/50 p-0 text-white backdrop-blur-md"
                  iconClassName="h-[17px] w-[17px]"
                />
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
      />
    </>
  );
}
