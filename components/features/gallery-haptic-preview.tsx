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
import { BadgeCheck, Palette, UserRound, X } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { TattooMachineLikeGlyph } from '@/components/ui/tattoo-like-button';
import { useI18n } from '@/hooks/use-i18n';
import { portfolioLabelResolver } from '@/lib/portfolio-metadata';

export type GalleryPreviewItem = {
  id: string;
  imageUrl: string;
  style: string;
  artistName: string;
  artistId: string | null;
  likes: number;
  kind?: 'artwork' | 'artist';
  verified?: boolean;
  initial?: string;
};

type GalleryHapticPreviewProps = {
  item: GalleryPreviewItem | null;
  onDismiss: () => void;
  onVisitProfile: (item: GalleryPreviewItem) => void;
  onExploreStyles: (item: GalleryPreviewItem) => void;
  showLike?: boolean;
};

export function galleryPreviewLayoutId(id: string) {
  return `gallery-haptic-${id}`;
}

const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 650;
const PREVIEW_SPRING = { type: 'spring', stiffness: 380, damping: 28, mass: 0.8 } as const;
const GPU_LAYER =
  'transform-gpu will-change-transform [backface-visibility:hidden] [transform:translateZ(0)]';

export function GalleryHapticPreview({
  item,
  onDismiss,
  onVisitProfile,
  onExploreStyles,
  showLike = true,
}: GalleryHapticPreviewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- portal target só existe no cliente; sincroniza após a montagem para não quebrar a hidratação SSR.
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence initial={false}>
      {item ? (
        <PreviewSurface
          key={item.id}
          item={item}
          onDismiss={onDismiss}
          onVisitProfile={onVisitProfile}
          onExploreStyles={onExploreStyles}
          showLike={showLike}
        />
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

function PreviewSurface({
  item,
  onDismiss,
  onVisitProfile,
  onExploreStyles,
  showLike = true,
}: GalleryHapticPreviewProps & { item: GalleryPreviewItem }) {
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

  const artistName = item.artistName || t('welcome.artistFallback');
  const style = item.style ? styleLabel(item.style) : '';
  const isArtist = item.kind === 'artist';
  const canShowLike = showLike && !isArtist;

  return (
    <motion.div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${artistName}${style ? ` — ${style}` : ''}`}
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
          layout="position"
          layoutId={galleryPreviewLayoutId(item.id)}
          drag={isPresent ? 'y' : false}
          dragElastic={0.2}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragMomentum={false}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          transition={PREVIEW_SPRING}
          style={{ backfaceVisibility: 'hidden' }}
          className={`relative w-full cursor-grab touch-none overflow-hidden border border-white/10 bg-zinc-900 shadow-[0_28px_90px_-18px_rgba(0,0,0,0.95)] active:cursor-grabbing ${GPU_LAYER} ${
            isArtist
              ? 'flex h-auto min-h-[16rem] max-h-[30rem] flex-col items-center justify-center rounded-[28px] px-6 py-10'
              : 'h-[52dvh] max-h-[30rem] min-h-[16rem] rounded-[22px]'
          }`}
        >
          {isArtist ? (
            <>
              <span className="relative flex h-36 w-36 min-h-36 min-w-36 items-center justify-center rounded-full bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-300 p-[3px]">
                <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-zinc-950 bg-zinc-900 text-4xl font-semibold uppercase text-orange-400">
                  {item.imageUrl ? (
                    <OptimizedImage
                      src={item.imageUrl}
                      alt={artistName}
                      className="h-full w-full rounded-full"
                    />
                  ) : (
                    item.initial || artistName.charAt(0)
                  )}
                </span>
                {item.verified ? (
                  <span className="absolute -bottom-1 -right-1 flex h-9 w-9 min-h-9 min-w-9 items-center justify-center rounded-full border-2 border-zinc-950 bg-orange-500 text-black">
                    <BadgeCheck className="h-5 w-5" strokeWidth={2.4} />
                  </span>
                ) : null}
              </span>
              <p className="mt-5 max-w-full truncate text-lg font-semibold tracking-tight text-white">
                {artistName}
              </p>
              {style ? (
                <p className="mt-1 text-[13px] font-medium text-zinc-300">{style}</p>
              ) : null}
            </>
          ) : (
            <>
              <OptimizedImage
                src={item.imageUrl}
                alt={`${style || t('gallery.title')} — ${artistName}`}
                className="h-full w-full"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-black/20" />
              {style ? (
                <span className="pointer-events-none absolute left-3 top-3 rounded-full border border-orange-500/40 bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-orange-300 backdrop-blur-md">
                  {style}
                </span>
              ) : null}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4">
                <p className="truncate text-sm font-semibold text-white">{artistName}</p>
                {canShowLike ? (
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-zinc-300">
                    <TattooMachineLikeGlyph liked className="h-3 w-3 text-orange-500" />
                    {item.likes}
                  </p>
                ) : null}
              </div>
            </>
          )}
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
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onVisitProfile(item)}
              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-orange-500/40 bg-orange-500/15 px-3 text-sm font-semibold text-orange-300 backdrop-blur-md transition-all duration-150 hover:border-orange-500 hover:bg-orange-500/25 active:scale-[0.97]"
            >
              <UserRound className="h-4 w-4" strokeWidth={1.9} />
              {t('gallery.visitProfile')}
            </button>
            <button
              type="button"
              onClick={() => onExploreStyles(item)}
              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm font-semibold text-zinc-200 backdrop-blur-md transition-all duration-150 hover:border-orange-500/40 hover:text-orange-200 active:scale-[0.97]"
            >
              <Palette className="h-4 w-4" strokeWidth={1.9} />
              {t('gallery.domainStyles')}
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
