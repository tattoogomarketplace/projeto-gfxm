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
import { Palette, UserRound, X } from 'lucide-react';
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
};

type GalleryHapticPreviewProps = {
  item: GalleryPreviewItem | null;
  onDismiss: () => void;
  onVisitProfile: (item: GalleryPreviewItem) => void;
  onExploreStyles: (item: GalleryPreviewItem) => void;
};

export function galleryPreviewLayoutId(id: string) {
  return `gallery-haptic-${id}`;
}

const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 650;
const PREVIEW_SPRING = { type: 'spring', stiffness: 350, damping: 25 } as const;

export function GalleryHapticPreview({
  item,
  onDismiss,
  onVisitProfile,
  onExploreStyles,
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

  return (
    <motion.div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${artistName}${style ? ` — ${style}` : ''}`}
      className="fixed inset-0 z-[120] flex touch-none items-center justify-center overflow-hidden overscroll-none px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 1 }}
      transition={PREVIEW_SPRING}
      style={{ pointerEvents: isPresent ? 'auto' : 'none' }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: isPresent ? 1 : 0 }}
        exit={{ opacity: 0 }}
        transition={PREVIEW_SPRING}
        onClick={handleBackdropClick}
      >
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-black/40 backdrop-blur-md"
          style={{ opacity: backdropOpacity }}
        />
      </motion.div>

      <motion.button
        type="button"
        onClick={onDismiss}
        aria-label={t('common.close')}
        initial={{ opacity: 0 }}
        animate={{ opacity: isPresent ? 1 : 0 }}
        exit={{ opacity: 0 }}
        transition={PREVIEW_SPRING}
        className="absolute right-4 top-[calc(env(safe-area-inset-top)+1rem)] z-20 flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-md transition-transform duration-150 active:scale-90"
      >
        <X className="h-5 w-5" strokeWidth={1.75} />
      </motion.button>

      <div className="relative z-10 flex w-full max-w-[26rem] flex-col items-center">
        <motion.div
          layout
          layoutId={galleryPreviewLayoutId(item.id)}
          drag={isPresent ? 'y' : false}
          dragElastic={0.2}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragMomentum={false}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          transition={PREVIEW_SPRING}
          className="relative h-[52dvh] max-h-[30rem] min-h-[16rem] w-full cursor-grab touch-none overflow-hidden rounded-[22px] border border-white/10 bg-zinc-900 shadow-[0_28px_90px_-18px_rgba(0,0,0,0.95)] active:cursor-grabbing"
        >
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
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-zinc-300">
              <TattooMachineLikeGlyph liked className="h-3 w-3 text-orange-500" />
              {item.likes}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: isPresent ? 1 : 0, y: isPresent ? 0 : 12 }}
          exit={{ opacity: 0, y: 12 }}
          transition={PREVIEW_SPRING}
          className="mt-5 w-full"
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
