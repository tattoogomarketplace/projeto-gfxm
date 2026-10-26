'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Bookmark } from 'lucide-react';
import { NATIVE_APP_IMAGE_STYLE, OptimizedImage } from '@/components/ui/optimized-image';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { artistProfileHref } from '@/lib/artist-profile';
import type { InspirationItem } from '@/lib/gallery-mock';
import { portfolioLabelResolver } from '@/lib/portfolio-metadata';

const SAVED_GALLERY_HREF = '/dashboard/inspiracoes';
const PEEK_DELAY_MS = 400;
const MOVE_TOLERANCE_PX = 10;
const CARD_SHELL =
  'relative aspect-[3/4] w-[9.75rem] shrink-0 snap-start overflow-hidden rounded-2xl transform-gpu will-change-transform [backface-visibility:hidden] [transform:translateZ(0)]';

const SHELF_CLASS =
  '-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-4 pb-2 [-webkit-overflow-scrolling:touch] scrollbar-none scrollbar-hide hide-scrollbar transform-gpu will-change-transform sm:-mx-6 sm:px-6';

export function InspiracoesPeekShelf({ items = [] }: { items?: InspirationItem[] }) {
  const { t } = useI18n();
  const { styleLabel } = portfolioLabelResolver(t);
  const router = useRouter();
  const { triggerHaptic } = useHapticFeedback();
  const peekCards = items.slice(0, 5);
  const [peekImage, setPeekImage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const pressTimer = useRef<NodeJS.Timeout | undefined>(undefined);
  const pressOrigin = useRef<{ x: number; y: number } | null>(null);
  const didPeek = useRef(false);
  const peekActive = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- portal target só existe no cliente; sincroniza após a montagem para não quebrar a hidratação SSR.
    setMounted(true);
  }, []);

  const clearPress = useCallback(() => {
    if (pressTimer.current !== undefined) {
      clearTimeout(pressTimer.current);
      pressTimer.current = undefined;
    }
    pressOrigin.current = null;
  }, []);

  const closePeek = useCallback(() => {
    clearPress();
    if (!peekActive.current) return;
    peekActive.current = false;
    setPeekImage(null);
  }, [clearPress]);

  useEffect(() => () => clearPress(), [clearPress]);

  useEffect(() => {
    if (!peekImage) return;

    const end = () => closePeek();
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    window.addEventListener('touchend', end);
    window.addEventListener('touchcancel', end);

    return () => {
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      window.removeEventListener('touchend', end);
      window.removeEventListener('touchcancel', end);
    };
  }, [peekImage, closePeek]);

  const onPointerDown =
    (imageUrl: string) => (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      clearPress();
      didPeek.current = false;
      pressOrigin.current = { x: event.clientX, y: event.clientY };
      pressTimer.current = setTimeout(() => {
        pressTimer.current = undefined;
        pressOrigin.current = null;
        didPeek.current = true;
        peekActive.current = true;
        triggerHaptic('medium');
        setPeekImage(imageUrl);
      }, PEEK_DELAY_MS);
    };

  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const origin = pressOrigin.current;
    if (!origin) return;
    if (
      Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > MOVE_TOLERANCE_PX
    ) {
      clearPress();
    }
  };

  const onPointerEnd = () => {
    clearPress();
    closePeek();
  };

  const onCardClick =
    (item: InspirationItem) => (event: ReactMouseEvent<HTMLButtonElement>) => {
      if (didPeek.current) {
        event.preventDefault();
        event.stopPropagation();
        didPeek.current = false;
        return;
      }
      triggerHaptic('light');
      router.push(artistProfileHref({ id: item.artistId, username: item.artistUsername }));
    };

  return (
    <>
      <section className="min-w-0 w-full space-y-3" aria-labelledby="discover-inspiracoes">
        <div className="flex w-full flex-row items-center justify-between p-3 mb-4 bg-[#121212]/80 border border-white/5 rounded-2xl backdrop-blur-sm">
          <div className="flex flex-row items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#FF5F1F]/10 text-[#FF5F1F]">
              <Bookmark className="h-5 w-5 shrink-0" strokeWidth={1.9} fill="currentColor" aria-hidden />
            </div>
            <h2 id="discover-inspiracoes" className="text-base sm:text-lg font-semibold text-white tracking-tight">
              {t('home.inspiracoes')}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              router.push(SAVED_GALLERY_HREF);
            }}
            className="text-sm font-medium text-[#FF5F1F] hover:text-[#FF5F1F]/80 transition-colors whitespace-nowrap flex-shrink-0 self-center m-0 flex items-center"
          >
            {t('home.viewAll')}
          </button>
        </div>
        <div className={SHELF_CLASS} role="list" aria-label={t('home.inspiracoes')}>
          {peekCards.map((item) => (
            <motion.button
              key={item.id}
              type="button"
              role="listitem"
              whileTap={{ scale: 0.96 }}
              onPointerDown={onPointerDown(item.imageUrl)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerEnd}
              onPointerLeave={onPointerEnd}
              onPointerCancel={onPointerEnd}
              onClick={onCardClick(item)}
              onContextMenu={(event) => event.preventDefault()}
              className={`${CARD_SHELL} border border-zinc-800/50 bg-zinc-900/40 text-left select-none touch-manipulation`}
              style={NATIVE_APP_IMAGE_STYLE}
            >
              <OptimizedImage
                src={item.imageUrl}
                alt={item.style ? styleLabel(item.style) : t('home.inspiracoes')}
                className="h-full w-full"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 rounded-b-2xl bg-gradient-to-t from-black/80 via-black/20 to-transparent"
              />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] px-3 pb-3">
                <span className="block truncate text-[12px] font-semibold tracking-tight text-white">
                  {item.style ? styleLabel(item.style) : t('home.inspiracoes')}
                </span>
              </span>
            </motion.button>
          ))}
          <button
            type="button"
            role="listitem"
            onClick={() => {
              triggerHaptic('light');
              router.push(SAVED_GALLERY_HREF);
            }}
            className={`${CARD_SHELL} flex cursor-pointer flex-col items-center justify-center gap-3 border border-white/10 bg-[#121212]/50 px-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md transition-transform active:scale-95`}
          >
            <span className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-full border border-orange-500/40 bg-orange-500/15 text-orange-500 shadow-[0_0_18px_rgba(249,115,22,0.28)]">
              <ArrowRight className="h-5 w-5" strokeWidth={1.9} aria-hidden />
            </span>
            <span className="text-[12px] font-semibold leading-snug tracking-tight text-gray-300">
              {t('home.viewAllInspiracoes')}
            </span>
          </button>
        </div>
      </section>

      {mounted && typeof document !== 'undefined' && document.body
        ? createPortal(
            <AnimatePresence>
              {peekImage ? (
                <motion.div
                  key="inspiracoes-peek"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-xl pointer-events-none"
                  aria-hidden
                >
                  <motion.img
                    src={peekImage}
                    alt=""
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1.05, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    draggable={false}
                    onDragStart={(event) => event.preventDefault()}
                    onContextMenu={(event) => event.preventDefault()}
                    className="max-h-[88dvh] w-auto aspect-[9/16] select-none object-cover"
                    style={NATIVE_APP_IMAGE_STYLE}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body
          )
        : null}
    </>
  );
}
