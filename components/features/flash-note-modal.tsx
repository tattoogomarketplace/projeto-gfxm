'use client';

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion';
import { Radio, X, Zap } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { formatFlashNotePrice, parseFlashNoteOffer } from '@/lib/flash-note-offer';
import { getFlashNoteBackground } from '@/lib/flash-notes-style';
import type { FlashNoteDto } from '@/lib/types/chat';
import { cn } from '@/lib/utils';

type FlashNoteModalProps = {
  note: FlashNoteDto | null;
  open: boolean;
  onClose: () => void;
  onBook?: (note: FlashNoteDto) => void;
  onVisitArtist?: (note: FlashNoteDto) => void;
};

const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 650;
const STORY_SPRING = { type: 'spring', stiffness: 420, damping: 32, mass: 0.72 } as const;
const EXIT_SNAP = { duration: 0.12, ease: [0.16, 1, 0.3, 1] as const };
const GPU_LAYER =
  'transform-gpu will-change-transform [backface-visibility:hidden] [transform:translateZ(0)]';

const clientMountedSubscribe = () => () => {};

function remainingLabel(expiresAt: string, expiringLabel: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return expiringLabel;
  const hours = Math.max(1, Math.round(ms / (60 * 60 * 1000)));
  return hours === 1 ? '1h' : `${hours}h`;
}

export function FlashNoteModal({
  note,
  open,
  onClose,
  onBook,
  onVisitArtist,
}: FlashNoteModalProps) {
  const mounted = useSyncExternalStore(clientMountedSubscribe, () => true, () => false);

  if (!mounted || typeof document === 'undefined' || !document.body) return null;

  return createPortal(
    <AnimatePresence initial={false}>
      {open && note ? (
        <FlashNoteStorySurface
          key={note.id}
          note={note}
          onClose={onClose}
          onBook={onBook}
          onVisitArtist={onVisitArtist}
        />
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

function FlashNoteStorySurface({
  note,
  onClose,
  onBook,
  onVisitArtist,
}: {
  note: FlashNoteDto;
  onClose: () => void;
  onBook?: (note: FlashNoteDto) => void;
  onVisitArtist?: (note: FlashNoteDto) => void;
}) {
  const { t, locale } = useI18n();
  const { triggerHaptic } = useHapticFeedback();
  const overlayRef = useRef<HTMLDivElement>(null);
  const openedAt = useRef(0);
  const dragY = useMotionValue(0);
  const backdropOpacity = useTransform(dragY, [0, 260], [1, 0.18]);

  const name = note.author?.name || t('flash.artist');
  const initial = note.author?.initial ?? 'A';
  const mediaUrl = note.author?.avatarUrl ?? null;
  const offer = parseFlashNoteOffer(note.content);
  const caption = offer.caption || note.content.trim();
  const surface = getFlashNoteBackground(note.backgroundId);

  useEffect(() => {
    openedAt.current = Date.now();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    const overlay = overlayRef.current;
    const blockWheel = (event: WheelEvent) => event.preventDefault();
    overlay?.addEventListener('wheel', blockWheel, { passive: false });

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      overlay?.removeEventListener('wheel', blockWheel);
    };
  }, [onClose]);

  const handleBackdropClick = useCallback(() => {
    if (Date.now() - openedAt.current < 240) return;
    triggerHaptic('light');
    onClose();
  }, [onClose, triggerHaptic]);

  const handleDrag = (_event: unknown, info: { offset: { y: number } }) => {
    dragY.set(Math.max(0, info.offset.y));
  };

  const handleDragEnd = (
    _event: unknown,
    info: { offset: { y: number }; velocity: { y: number } }
  ) => {
    if (info.offset.y > DISMISS_DISTANCE || info.velocity.y > DISMISS_VELOCITY) {
      triggerHaptic('light');
      onClose();
      return;
    }
    dragY.set(0);
  };

  const handleBook = useCallback(() => {
    triggerHaptic('medium');
    onBook?.(note);
  }, [note, onBook, triggerHaptic]);

  const handleVisit = useCallback(() => {
    triggerHaptic('light');
    onVisitArtist?.(note);
  }, [note, onVisitArtist, triggerHaptic]);

  const priceLocale = locale.startsWith('pt') ? 'pt-BR' : locale === 'es' ? 'es-ES' : 'en-US';

  return (
    <motion.div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={t('flash.storyAria', { name })}
      className={cn(
        'fixed inset-0 z-[120] flex touch-none items-center justify-center overflow-hidden overscroll-none contain-paint',
        'px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]',
        GPU_LAYER
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: EXIT_SNAP }}
      transition={STORY_SPRING}
      style={{ backfaceVisibility: 'hidden' }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <motion.div
        className={cn('absolute inset-0', GPU_LAYER)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: EXIT_SNAP }}
        transition={STORY_SPRING}
        onClick={handleBackdropClick}
        style={{ backfaceVisibility: 'hidden' }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-black/90 backdrop-blur-3xl" />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-black/70"
          style={{ opacity: backdropOpacity, backfaceVisibility: 'hidden' }}
        />
      </motion.div>

      <motion.button
        type="button"
        onClick={() => {
          triggerHaptic('light');
          onClose();
        }}
        aria-label={t('common.close')}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92, transition: EXIT_SNAP }}
        transition={STORY_SPRING}
        className={cn(
          'absolute right-4 top-[calc(env(safe-area-inset-top)+0.75rem)] z-20',
          'flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-full',
          'border border-white/10 bg-black/50 text-white backdrop-blur-md',
          GPU_LAYER
        )}
        whileTap={{ scale: 0.9 }}
      >
        <X className="h-5 w-5" strokeWidth={1.75} />
      </motion.button>

      <motion.article
        drag="y"
        dragElastic={0.18}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragMomentum={false}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        transition={STORY_SPRING}
        style={{ y: dragY, backfaceVisibility: 'hidden' }}
        initial={{ opacity: 0, scale: 0.96, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 16, transition: EXIT_SNAP }}
        className={cn(
          'relative z-10 flex w-full max-w-[26.5rem] cursor-grab touch-none flex-col overflow-hidden',
          'aspect-[9/16] max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1.5rem))]',
          'rounded-3xl border border-white/10 bg-[#121212] ring-1 ring-[#FF5F1F]/30',
          'shadow-[0_28px_90px_-18px_rgba(0,0,0,0.95)] active:cursor-grabbing',
          GPU_LAYER
        )}
      >
        <div className="absolute inset-0" style={{ backgroundImage: surface.css }} />

        {mediaUrl ? (
          <OptimizedImage
            src={mediaUrl}
            alt={name}
            sizes="(max-width: 480px) 100vw, 420px"
            className="absolute inset-0 h-full w-full"
            fallback={null}
          />
        ) : null}

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-black/10 to-black/80"
        />

        <header className="relative z-10 flex items-center gap-3 px-4 pt-4">
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={handleVisit}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <span className="relative flex h-11 w-11 min-h-11 min-w-11 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-[#1a1a1a]">
              <OptimizedImage
                src={note.author?.avatarUrl}
                alt={name}
                sizes="44px"
                className="h-full w-full rounded-full"
                fallback={
                  <span className="flex h-full w-full items-center justify-center text-sm font-semibold uppercase text-orange-400">
                    {initial}
                  </span>
                }
              />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-white">{name}</span>
              <span className="mt-0.5 flex items-center gap-1 text-[11px] text-orange-400">
                <Radio className="h-3 w-3" strokeWidth={2.4} />
                {t('flash.active')} · {remainingLabel(note.expiresAt, t('flash.expiring'))}
              </span>
            </span>
          </button>
        </header>

        <div className="relative z-10 mt-auto flex flex-col gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6">
          {offer.discountPercent != null || offer.originalPrice != null ? (
            <div className="flex flex-wrap items-center gap-2">
              {offer.discountPercent != null ? (
                <span className="rounded-full border border-[#FF5F1F]/50 bg-[#FF5F1F]/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-orange-200 backdrop-blur-md">
                  {t('flash.discountOff', { value: String(offer.discountPercent) })}
                </span>
              ) : null}
              {offer.originalPrice != null ? (
                <span className="flex items-baseline gap-1.5 text-white">
                  {offer.salePrice != null ? (
                    <span className="text-lg font-bold tracking-tight">
                      {formatFlashNotePrice(offer.salePrice, priceLocale)}
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      'text-[12px] font-medium text-zinc-400',
                      offer.salePrice != null ? 'line-through' : 'text-zinc-200'
                    )}
                  >
                    {t('flash.fromPrice', {
                      price: formatFlashNotePrice(offer.originalPrice, priceLocale),
                    })}
                  </span>
                </span>
              ) : null}
            </div>
          ) : null}

          {caption ? (
            <p
              className={cn(
                'text-[15px] font-medium leading-relaxed text-zinc-100',
                note.fontClass,
                note.alignClass
              )}
            >
              {caption}
            </p>
          ) : null}

          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={handleBook}
            className={cn(
              'mt-1 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl',
              'bg-gradient-to-b from-orange-500 to-orange-600 px-4 text-[15px] font-bold text-white',
              'shadow-[0_0_22px_rgba(249,115,22,0.45)] transition-[transform,box-shadow] duration-100',
              'active:scale-[0.97] hover:shadow-[0_0_28px_rgba(249,115,22,0.7)]'
            )}
          >
            <Zap className="h-4 w-4" strokeWidth={2.4} />
            {t('flash.bookNow')}
          </button>
        </div>
      </motion.article>
    </motion.div>
  );
}
