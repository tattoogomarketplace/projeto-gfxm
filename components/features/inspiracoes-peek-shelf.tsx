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
import { ArrowRight, Images } from 'lucide-react';
import { NATIVE_APP_IMAGE_STYLE, OptimizedImage } from '@/components/ui/optimized-image';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { artistProfileHref } from '@/lib/artist-profile';
import { PLACEHOLDER_INSPIRATIONS } from '@/lib/gallery-mock';
import { portfolioLabelResolver } from '@/lib/portfolio-metadata';

const PEEK_DELAY_MS = 400;
const MOVE_TOLERANCE_PX = 10;
const PEEK_CARDS = PLACEHOLDER_INSPIRATIONS.slice(0, 4);
const CARD_SHELL =
  'relative aspect-[9/16] w-[10.5rem] shrink-0 snap-start overflow-hidden rounded-2xl';

const SHELF_CLASS =
  '-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-4 pb-2 [-webkit-overflow-scrolling:touch] scrollbar-none scrollbar-hide sm:-mx-6 sm:px-6';

export function InspiracoesPeekShelf() {
  const { t } = useI18n();
  const { styleLabel } = portfolioLabelResolver(t);
  const router = useRouter();
  const { triggerHaptic } = useHapticFeedback();
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
    (item: (typeof PEEK_CARDS)[number]) => (event: ReactMouseEvent<HTMLButtonElement>) => {
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
        <div className="mb-4 flex w-full items-center justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <Images className="h-5 w-5 shrink-0 text-orange-500" strokeWidth={1.9} aria-hidden />
            <h2 id="discover-inspiracoes" className="truncate text-lg font-bold text-zinc-100 md:text-xl">
              {t('home.inspiracoes')}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              router.push('/dashboard/galeria');
            }}
            className="min-h-11 shrink-0 text-[13px] font-semibold text-orange-500 active:opacity-70 transition-opacity"
          >
            {t('home.viewAll')}
          </button>
        </div>
        <div className={SHELF_CLASS} role="list" aria-label={t('home.inspiracoes')}>
          {PEEK_CARDS.map((item) => (
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
              router.push('/dashboard/galeria');
            }}
            className={`${CARD_SHELL} flex cursor-pointer flex-col items-center justify-center gap-3 border border-white/10 bg-[#121212]/50 backdrop-blur-md transition-transform active:scale-95`}
          >
            <span className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-full border border-orange-500/40 bg-orange-500/15 text-orange-500">
              <ArrowRight className="h-5 w-5" strokeWidth={1.9} aria-hidden />
            </span>
            <span className="text-[12px] font-semibold text-gray-300">Ver todas</span>
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
