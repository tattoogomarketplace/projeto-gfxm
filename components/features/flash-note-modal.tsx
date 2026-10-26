'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion';
import { Loader2, Radio, X, Zap } from 'lucide-react';
import { bookFlashNote, type BookFlashNoteCode } from '@/app/actions/flash-note-booking';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { buildFlashNoteOffer, formatFlashNotePrice } from '@/lib/flash-note-offer';
import { getFlashNoteBackground } from '@/lib/flash-notes-style';
import { toast } from '@/lib/toast';
import type { FlashNoteDto } from '@/lib/types/chat';
import { cn } from '@/lib/utils';

type FlashNoteModalProps = {
  note: FlashNoteDto | null;
  open: boolean;
  onClose: () => void;
  onBook?: (note: FlashNoteDto) => void;
  onVisitArtist?: (note: FlashNoteDto) => void;
  onNext?: () => void;
  onPrev?: () => void;
};

type GestureState = 'IDLE' | 'HOLDING' | 'ZOOMING' | 'BUDGET';

const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 650;
const STORY_DURATION_MS = 15000;
const HOLD_DELAY_MS = 180;
const ZOOM_TRIGGER_PX = 15;
const BUDGET_TRIGGER_PX = -15;
const ZOOM_SCALE_DIVISOR = 300;
const ZOOM_MAX = 2.5;
const STORY_SPRING = { type: 'spring', stiffness: 420, damping: 32, mass: 0.72 } as const;
const EXIT_SNAP = { duration: 0.12, ease: [0.16, 1, 0.3, 1] as const };
const GPU_LAYER =
  'transform-gpu will-change-transform [backface-visibility:hidden] [transform:translateZ(0)]';

const clientMountedSubscribe = () => () => {};

function bookErrorKey(code: BookFlashNoteCode) {
  if (code === 'UNAUTHENTICATED') return 'toast.flashBookAuth' as const;
  if (code === 'INVALID_PRICE') return 'toast.flashBookPrice' as const;
  if (code === 'CONSUMED' || code === 'CONFLICT' || code === 'NO_SLOT') {
    return 'toast.flashBookUnavailable' as const;
  }
  return 'toast.flashBookFailed' as const;
}

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
  onNext,
  onPrev,
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
          onNext={onNext}
          onPrev={onPrev}
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
  onNext,
  onPrev,
}: {
  note: FlashNoteDto;
  onClose: () => void;
  onBook?: (note: FlashNoteDto) => void;
  onVisitArtist?: (note: FlashNoteDto) => void;
  onNext?: () => void;
  onPrev?: () => void;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { triggerHaptic } = useHapticFeedback();
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragY = useMotionValue(0);
  const backdropOpacity = useTransform(dragY, [0, 260], [1, 0.18]);
  const [isPending, startTransition] = useTransition();
  const [gestureState, setGestureState] = useState<GestureState>('IDLE');
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const isPendingRef = useRef(isPending);
  const gestureStateRef = useRef<GestureState>('IDLE');
  const dragStartYRef = useRef<number | null>(null);
  const onNextRef = useRef(onNext);
  const onPrevRef = useRef(onPrev);
  const onCloseRef = useRef(onClose);
  const remainingMsRef = useRef(STORY_DURATION_MS);
  const lastTickRef = useRef<number | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const didHoldRef = useRef(false);
  const isGestureLocked = gestureState !== 'IDLE';

  useEffect(() => {
    isPendingRef.current = isPending;
    gestureStateRef.current = gestureState;
    dragStartYRef.current = dragStartY;
    onNextRef.current = onNext;
    onPrevRef.current = onPrev;
    onCloseRef.current = onClose;
  }, [dragStartY, gestureState, isPending, onClose, onNext, onPrev]);

  const name = note.author?.name || t('flash.artist');
  const initial = note.author?.initial ?? 'A';
  const mediaUrl = note.imageUrl || note.author?.avatarUrl || null;
  const offer = buildFlashNoteOffer({
    content: note.content,
    price: note.price,
    discountPercentage: note.discountPercentage,
  });
  const caption = offer.caption || note.content.trim();
  const surface = getFlashNoteBackground(note.backgroundId);

  const nextNote = useCallback(() => {
    if (isPendingRef.current) return;
    triggerHaptic('light');
    if (onNextRef.current) onNextRef.current();
    else onCloseRef.current();
  }, [triggerHaptic]);

  const prevNote = useCallback(() => {
    if (isPendingRef.current) return;
    triggerHaptic('light');
    if (onPrevRef.current) onPrevRef.current();
    else onCloseRef.current();
  }, [triggerHaptic]);

  useEffect(() => {
    if (gestureState === 'BUDGET' || isGestureLocked || isPending || isSheetOpen) {
      lastTickRef.current = null;
      return undefined;
    }
    lastTickRef.current = performance.now();
    const timeoutId = window.setTimeout(() => {
      nextNote();
    }, remainingMsRef.current);
    const intervalId = window.setInterval(() => {
      const now = performance.now();
      const last = lastTickRef.current ?? now;
      remainingMsRef.current = Math.max(0, remainingMsRef.current - (now - last));
      lastTickRef.current = now;
    }, 50);
    return () => {
      const now = performance.now();
      const last = lastTickRef.current ?? now;
      remainingMsRef.current = Math.max(0, remainingMsRef.current - (now - last));
      lastTickRef.current = null;
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [note.id, gestureState, isGestureLocked, isPending, isSheetOpen, nextNote]);

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current != null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const beginHold = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (isPendingRef.current || gestureStateRef.current === 'BUDGET' || isSheetOpen) return;
    didHoldRef.current = false;
    setDragStartY(event.clientY);
    dragStartYRef.current = event.clientY;
    setGestureState('HOLDING');
    gestureStateRef.current = 'HOLDING';
    clearHoldTimer();
    holdTimerRef.current = window.setTimeout(() => {
      didHoldRef.current = true;
      triggerHaptic('light');
    }, HOLD_DELAY_MS);
  }, [clearHoldTimer, isSheetOpen, triggerHaptic]);

  const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const state = gestureStateRef.current;
    const startY = dragStartYRef.current;
    if (state === 'IDLE' || startY == null) return;

    const deltaY = event.clientY - startY;

    if (state === 'HOLDING') {
      if (deltaY > ZOOM_TRIGGER_PX) {
        didHoldRef.current = true;
        clearHoldTimer();
        setGestureState('ZOOMING');
        gestureStateRef.current = 'ZOOMING';
        setZoomScale(Math.min(ZOOM_MAX, 1 + Math.max(0, deltaY) / ZOOM_SCALE_DIVISOR));
        triggerHaptic('light');
        return;
      }
      if (deltaY < BUDGET_TRIGGER_PX) {
        didHoldRef.current = true;
        clearHoldTimer();
        setGestureState('BUDGET');
        gestureStateRef.current = 'BUDGET';
        setIsSheetOpen(true);
        setZoomScale(1);
        triggerHaptic('medium');
      }
      return;
    }

    if (state === 'ZOOMING') {
      if (deltaY < 0) return;
      setZoomScale(Math.min(ZOOM_MAX, 1 + Math.max(0, deltaY) / ZOOM_SCALE_DIVISOR));
    }
  }, [clearHoldTimer, triggerHaptic]);

  const endHold = useCallback(() => {
    clearHoldTimer();
    setDragStartY(null);
    dragStartYRef.current = null;
    setZoomScale(1);
    if (gestureStateRef.current === 'ZOOMING' || gestureStateRef.current === 'HOLDING') {
      setGestureState('IDLE');
      gestureStateRef.current = 'IDLE';
    }
  }, [clearHoldTimer]);

  const closeBudgetSheet = useCallback(() => {
    setIsSheetOpen(false);
    setGestureState('IDLE');
    gestureStateRef.current = 'IDLE';
    setDragStartY(null);
    dragStartYRef.current = null;
    setZoomScale(1);
  }, []);

  useEffect(() => () => clearHoldTimer(), [clearHoldTimer]);

  const handleZoneClick = useCallback(
    (direction: 'prev' | 'next') => {
      if (didHoldRef.current) {
        didHoldRef.current = false;
        return;
      }
      if (direction === 'prev') prevNote();
      else nextNote();
    },
    [nextNote, prevNote]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isPendingRef.current) return;
      if (event.key === 'Escape') {
        if (isSheetOpen) {
          closeBudgetSheet();
          return;
        }
        onClose();
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        nextNote();
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        prevNote();
      }
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
  }, [closeBudgetSheet, isSheetOpen, nextNote, onClose, prevNote]);

  const handleDrag = (_event: unknown, info: { offset: { y: number } }) => {
    dragY.set(Math.max(0, info.offset.y));
  };

  const handleDragEnd = (
    _event: unknown,
    info: { offset: { y: number }; velocity: { y: number } }
  ) => {
    if (isPending) {
      dragY.set(0);
      return;
    }
    if (info.offset.y > DISMISS_DISTANCE || info.velocity.y > DISMISS_VELOCITY) {
      triggerHaptic('light');
      onClose();
      return;
    }
    dragY.set(0);
  };

  const handleBook = useCallback(() => {
    if (isPending) return;
    triggerHaptic('medium');
    startTransition(async () => {
      const result = await bookFlashNote(note.id);
      if (!result.success) {
        triggerHaptic('heavy');
        toast.error(result.error || t(bookErrorKey(result.code)));
        return;
      }
      triggerHaptic('success');
      toast.success(t('toast.flashBooked'), {
        description: t('toast.flashBookedHint'),
      });
      onBook?.(note);
      onClose();
      router.refresh();
      router.push('/dashboard/agenda');
    });
  }, [isPending, note, onBook, onClose, router, t, triggerHaptic]);

  const handleVisit = useCallback(() => {
    if (isPending) return;
    triggerHaptic('light');
    onVisitArtist?.(note);
  }, [isPending, note, onVisitArtist, triggerHaptic]);

  const priceLocale = locale.startsWith('pt') ? 'pt-BR' : locale === 'es' ? 'es-ES' : 'en-US';

  return (
    <motion.div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={t('flash.storyAria', { name })}
      className={cn(
        'fixed inset-0 z-[120] flex h-[100dvh] w-screen flex-col overflow-hidden bg-black',
        'supports-[height:100cqh]:h-[100cqh] touch-none overscroll-none contain-paint',
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
        aria-hidden
        className={cn('pointer-events-none absolute inset-0 z-0 bg-black', GPU_LAYER)}
        style={{ opacity: backdropOpacity, backfaceVisibility: 'hidden' }}
      />

      <motion.article
        drag={isPending || isGestureLocked || isSheetOpen ? false : 'y'}
        dragElastic={0.18}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragMomentum={false}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        transition={STORY_SPRING}
        style={{ y: dragY, backfaceVisibility: 'hidden' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: EXIT_SNAP }}
        className={cn(
          'relative flex h-[100dvh] w-screen cursor-grab flex-col overflow-hidden bg-black active:cursor-grabbing',
          'supports-[height:100cqh]:h-[100cqh]',
          GPU_LAYER
        )}
      >
        <div className="absolute inset-0 z-0" style={{ backgroundImage: surface.css }} />

        {mediaUrl ? (
          <div
            className={cn(
              'absolute inset-0 z-0 origin-center will-change-transform transform-gpu',
              gestureState !== 'ZOOMING' ? 'transition-transform duration-300 ease-out' : ''
            )}
            style={{ transform: `scale3d(${zoomScale}, ${zoomScale}, 1)` }}
          >
            <OptimizedImage
              key={note.id}
              src={mediaUrl}
              alt={name}
              sizes="100vw"
              className="absolute inset-0 z-0 h-full w-full object-cover"
              fallback={null}
              priority
            />
          </div>
        ) : null}

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-black/70 via-transparent to-black/80"
        />

        <div
          aria-hidden
          className="absolute bottom-32 left-0 top-20 z-10 w-[30%]"
          onPointerDown={beginHold}
          onPointerMove={handlePointerMove}
          onPointerUp={endHold}
          onPointerCancel={endHold}
          onPointerLeave={endHold}
          onContextMenu={(event) => event.preventDefault()}
          onClick={() => handleZoneClick('prev')}
        />
        <div
          aria-hidden
          className="absolute bottom-32 right-0 top-20 z-10 w-[70%]"
          onPointerDown={beginHold}
          onPointerMove={handlePointerMove}
          onPointerUp={endHold}
          onPointerCancel={endHold}
          onPointerLeave={endHold}
          onContextMenu={(event) => event.preventDefault()}
          onClick={() => handleZoneClick('next')}
        />

        <div
          className={cn(
            'absolute inset-0 z-30 flex flex-col items-center justify-center gap-12 pointer-events-none transition-opacity duration-150',
            gestureState === 'HOLDING' ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
        >
          <div className="flex flex-col items-center gap-2 animate-bounce-slow">
            <span className="text-white text-xl">↑</span>
            <div className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white text-sm font-medium tracking-wide shadow-2xl">
              Deslize para Orçamento
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 animate-bounce-slow-reverse">
            <div className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white text-sm font-medium tracking-wide shadow-2xl">
              Deslize para Zoom
            </div>
            <span className="text-white text-xl">↓</span>
          </div>
        </div>

        <div className="pointer-events-none absolute left-4 right-4 top-[max(1rem,env(safe-area-inset-top))] z-20 flex h-1 gap-1">
          <div
            className="h-1 w-full overflow-hidden rounded-full bg-white/25"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('flash.expiring')}
          >
            <div
              key={note.id}
              className="flash-story-progress-fill h-full w-full origin-left rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.55)]"
              style={{
                animationPlayState:
                  gestureState === 'BUDGET' || isGestureLocked || isPending || isSheetOpen
                    ? 'paused'
                    : 'running',
              }}
            />
          </div>
        </div>

        <header
          className={cn(
            'absolute left-4 right-4 top-[max(2rem,calc(env(safe-area-inset-top)+1.5rem))] z-20 flex items-center justify-between transition-opacity duration-300',
            isGestureLocked || isSheetOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
          )}
        >
          <button
            type="button"
            disabled={isPending}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={handleVisit}
            className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:pointer-events-none"
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
                {t('flash.active')} - {remainingLabel(note.expiresAt, t('flash.expiring'))}
              </span>
            </span>
          </button>
          <motion.button
            type="button"
            disabled={isPending}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => {
              if (isPending) return;
              triggerHaptic('light');
              onClose();
            }}
            aria-label={t('common.close')}
            className={cn(
              'ml-3 flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-full',
              'border border-white/10 bg-black/50 text-white backdrop-blur-md',
              GPU_LAYER
            )}
            whileTap={{ scale: 0.9 }}
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </motion.button>
        </header>

        <div
          className={cn(
            'fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm transition-opacity duration-300',
            gestureState === 'BUDGET' ? 'opacity-100' : 'pointer-events-none opacity-0'
          )}
          onClick={() => {
            if (gestureState !== 'BUDGET') return;
            triggerHaptic('light');
            closeBudgetSheet();
          }}
        />

        <div
          className={cn(
            'fixed inset-x-0 bottom-0 z-[100] flex w-full max-h-[65dvh] flex-col overflow-hidden rounded-t-[2.5rem] border-t border-white/10 bg-[#121212]/80 shadow-2xl backdrop-blur-3xl transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
            gestureState === 'BUDGET' ? 'translate-y-0' : 'pointer-events-none translate-y-full'
          )}
        >
          <div className="relative shrink-0">
            <div className="mx-auto mt-4 mb-6 h-1.5 w-12 rounded-full bg-white/20" />
            <button
              type="button"
              disabled={isPending}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => {
                triggerHaptic('light');
                closeBudgetSheet();
              }}
              aria-label={t('common.close')}
              className="absolute right-4 top-3 flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white"
            >
              <X className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-2 [-webkit-overflow-scrolling:touch]">
            {caption ? (
              <p
                className={cn(
                  'mb-4 text-[15px] font-medium leading-relaxed text-zinc-100',
                  note.fontClass,
                  note.alignClass
                )}
              >
                {caption}
              </p>
            ) : null}

            {offer.originalPrice != null ? (
              <div className="mb-8 flex flex-row items-end gap-3">
                {offer.salePrice != null && offer.salePrice !== offer.originalPrice ? (
                  <span className="text-lg text-gray-400 line-through">
                    {formatFlashNotePrice(offer.originalPrice, priceLocale)}
                  </span>
                ) : null}
                {offer.discountPercent != null ? (
                  <span className="rounded-md bg-[#FF5F1F]/20 px-2 py-1 text-xs font-bold text-[#FF5F1F]">
                    {t('flash.discountOff', { value: String(offer.discountPercent) })}
                  </span>
                ) : null}
                <span className="text-4xl font-black tracking-tight text-[#FF5F1F]">
                  {formatFlashNotePrice(
                    offer.salePrice != null && offer.salePrice !== offer.originalPrice
                      ? offer.salePrice
                      : offer.originalPrice,
                    priceLocale
                  )}
                </span>
              </div>
            ) : null}

            <button
              type="button"
              disabled={isPending}
              aria-busy={isPending}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={handleBook}
              className={cn(
                'mt-auto flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#FF5F1F] py-4 text-lg font-bold text-white',
                'transition-transform active:scale-[0.98]',
                'disabled:pointer-events-none disabled:opacity-80'
              )}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.4} />
              ) : (
                <Zap className="h-4 w-4" strokeWidth={2.4} />
              )}
              {isPending ? t('booking.reserving') : t('flash.bookNow')}
            </button>
          </div>
        </div>
      </motion.article>
    </motion.div>
  );
}
