'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  usePresence,
  useTransform,
} from 'framer-motion';
import { BadgeCheck, Star, X } from 'lucide-react';
import { ReviewStars } from '@/components/features/feedback-card';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { useI18n } from '@/hooks/use-i18n';
import { portfolioLabelResolver } from '@/lib/portfolio-metadata';
import type { ReviewDto } from '@/lib/types/review';

type ReviewHapticPreviewProps = {
  review: ReviewDto | null;
  onDismiss: () => void;
  onViewFull: (review: ReviewDto) => void;
};

const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 650;
const PREVIEW_SPRING = { type: 'spring', stiffness: 380, damping: 28, mass: 0.8 } as const;
const GPU_LAYER =
  'transform-gpu will-change-transform [backface-visibility:hidden] [transform:translateZ(0)]';

export function ReviewHapticPreview({
  review,
  onDismiss,
  onViewFull,
}: ReviewHapticPreviewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- portal target só existe no cliente; sincroniza após a montagem para não quebrar a hidratação SSR.
    setMounted(true);
  }, []);

  if (!mounted || typeof document === 'undefined' || !document.body) return null;
  if (review && !review.id) return null;

  return createPortal(
    <AnimatePresence initial={false}>
      {review ? (
        <PreviewSurface
          key={review.id}
          review={review}
          onDismiss={onDismiss}
          onViewFull={onViewFull}
        />
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

function PreviewSurface({
  review,
  onDismiss,
  onViewFull,
}: {
  review: ReviewDto;
  onDismiss: () => void;
  onViewFull: (review: ReviewDto) => void;
}) {
  const { t } = useI18n();
  const { styleLabel } = portfolioLabelResolver(t);
  const overlayRef = useRef<HTMLDivElement>(null);
  const openedAt = useRef(0);
  const dragY = useMotionValue(0);
  const backdropOpacity = useTransform(dragY, [0, 260], [1, 0.15]);
  const [isPresent, safeToRemove] = usePresence();

  useEffect(() => {
    openedAt.current = Date.now();
  }, []);

  useEffect(() => {
    if (isPresent) return;
    dragY.set(0);
    const timeout = window.setTimeout(() => safeToRemove?.(), 520);
    return () => window.clearTimeout(timeout);
  }, [dragY, isPresent, safeToRemove]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKeyDown);

    const overlay = overlayRef.current;
    const blockWheel = (event: WheelEvent) => event.preventDefault();
    overlay?.addEventListener('wheel', blockWheel, { passive: false });

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      overlay?.removeEventListener('wheel', blockWheel);
    };
  }, [onDismiss]);

  const handleBackdropClick = () => {
    if (Date.now() - openedAt.current < 260) return;
    onDismiss();
  };

  const handleDrag = (_event: unknown, info: { offset: { y: number } }) => {
    dragY.set(Math.max(0, info.offset.y));
  };

  const handleDragEnd = (
    _event: unknown,
    info: { offset: { y: number }; velocity: { y: number } }
  ) => {
    if (info.offset.y > DISMISS_DISTANCE || info.velocity.y > DISMISS_VELOCITY) {
      onDismiss();
      return;
    }
    dragY.set(0);
  };

  const authorName = review.author?.name?.trim() || t('welcome.artistFallback');
  const targetName = review.target?.name?.trim() || t('welcome.artistFallback');
  const authorInitial =
    review.author?.initial || authorName.charAt(0).toUpperCase() || 'A';
  const style = review.portfolio?.style ? styleLabel(review.portfolio.style) : '';
  const label = `${authorName} — ${targetName}`;

  return (
    <motion.div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className={`fixed inset-0 z-[120] flex touch-none items-center justify-center overflow-hidden overscroll-none contain-paint px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] ${GPU_LAYER}`}
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 1 }}
      transition={PREVIEW_SPRING}
      style={{ pointerEvents: isPresent ? 'auto' : 'none', backfaceVisibility: 'hidden' }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <motion.div
        className={`absolute inset-0 ${GPU_LAYER}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: isPresent ? 1 : 0 }}
        exit={{ opacity: 0 }}
        transition={PREVIEW_SPRING}
        onClick={handleBackdropClick}
        style={{ backfaceVisibility: 'hidden' }}
      >
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 bg-black/40 backdrop-blur-md ${GPU_LAYER}`}
        />
        <motion.div
          aria-hidden
          className={`pointer-events-none absolute inset-0 bg-black/50 ${GPU_LAYER}`}
          style={{ opacity: backdropOpacity, backfaceVisibility: 'hidden' }}
        />
      </motion.div>

      <motion.button
        type="button"
        onClick={onDismiss}
        aria-label={t('common.close')}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: isPresent ? 1 : 0, scale: isPresent ? 1 : 0.92 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={PREVIEW_SPRING}
        className={`absolute right-4 top-[calc(env(safe-area-inset-top)+1rem)] z-20 flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-md ${GPU_LAYER}`}
        whileTap={{ scale: 0.9 }}
      >
        <X className="h-5 w-5" strokeWidth={1.75} />
      </motion.button>

      <div className="relative z-10 flex w-full max-w-[26rem] flex-col items-center">
        <motion.div
          drag={isPresent ? 'y' : false}
          dragElastic={0.2}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragMomentum={false}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          transition={PREVIEW_SPRING}
          style={{ backfaceVisibility: 'hidden' }}
          className={`relative flex w-full cursor-grab touch-none flex-col overflow-hidden rounded-[22px] border border-white/10 bg-zinc-900 shadow-[0_28px_90px_-18px_rgba(0,0,0,0.95)] active:cursor-grabbing ${GPU_LAYER}`}
        >
          {review.portfolio?.imageUrl ? (
            <div className="relative h-40 w-full shrink-0">
              <OptimizedImage
                src={review.portfolio.imageUrl}
                alt={style || targetName}
                className="h-full w-full"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-black/20" />
              {style ? (
                <span className="pointer-events-none absolute left-3 top-3 rounded-full border border-orange-500/40 bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-orange-300 backdrop-blur-md">
                  {style}
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <ReviewStars rating={review.rating} size="md" />
              {review.isVerified ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-orange-300">
                  <BadgeCheck className="h-3.5 w-3.5" strokeWidth={2.2} />
                  {t('profile.verified')}
                </span>
              ) : null}
            </div>

            <p className="max-h-[28dvh] overflow-y-auto overscroll-contain text-[15px] leading-relaxed text-zinc-100">
              {review.content}
            </p>

            <div className="flex items-center gap-2.5 pt-1">
              <span className="flex h-9 w-9 min-h-9 min-w-9 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-zinc-800 text-[13px] font-semibold uppercase text-orange-400">
                {review.author?.avatarUrl ? (
                  <OptimizedImage
                    src={review.author.avatarUrl}
                    alt={authorName}
                    className="h-full w-full rounded-full"
                  />
                ) : (
                  authorInitial
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{authorName}</p>
                <p className="truncate text-[12px] text-zinc-400">{targetName}</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: isPresent ? 1 : 0, y: isPresent ? 0 : 12 }}
          exit={{ opacity: 0, y: 12 }}
          transition={PREVIEW_SPRING}
          className={`mt-5 w-full ${GPU_LAYER}`}
          style={{ backfaceVisibility: 'hidden' }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => onViewFull(review)}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-orange-500/40 bg-orange-500/15 px-3 text-sm font-semibold text-orange-300 backdrop-blur-md transition-all duration-150 hover:border-orange-500 hover:bg-orange-500/25 active:scale-[0.97]"
          >
            <Star className="h-4 w-4" strokeWidth={1.9} />
            {t('home.viewFullReview')}
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
