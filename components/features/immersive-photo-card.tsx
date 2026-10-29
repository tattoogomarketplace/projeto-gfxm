'use client';

import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bookmark, Eye, FileText, Send } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { TattooMachineLikeGlyph } from '@/components/ui/tattoo-like-button';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { cn } from '@/lib/utils';

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1568515045052-f9a854d70bfd?auto=format&fit=crop&w=1600&q=80';

const GRIP_CURVE = [
  'translate3d(0,0,0)',
  'translate3d(-6px,0,0)',
  'translate3d(-10px,0,0)',
  'translate3d(-6px,0,0)',
  'translate3d(0,0,0)',
] as const;

const DOUBLE_TAP_MS = 320;
const LIKE_BURST_MS = 800;

export type ImmersivePhotoCardProps = {
  imageUrl?: string | null;
  username?: string;
  artistName?: string;
  caption?: string;
  viewsCount?: number;
  liked?: boolean;
  saved?: boolean;
  shareUrl?: string;
  onLike?: () => void;
  onSave?: () => void;
  onQuote?: () => void;
  onShare?: () => void;
};

function formatViews(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(count);
}

export function ImmersivePhotoCard({
  imageUrl,
  username = 'artist',
  artistName,
  caption,
  viewsCount = 0,
  liked = false,
  saved = false,
  shareUrl,
  onLike,
  onSave,
  onQuote,
  onShare,
}: ImmersivePhotoCardProps) {
  const { triggerHaptic } = useHapticFeedback();
  const [isUIVisible, setIsUIVisible] = useState(true);
  const [isLiked, setIsLiked] = useState(liked);
  const [isSaved, setIsSaved] = useState(saved);
  const [likePulse, setLikePulse] = useState(0);
  const [burstNonce, setBurstNonce] = useState(0);
  const lastTapAt = useRef(0);
  const burstTimer = useRef<number | null>(null);
  const handle = username.replace(/^@+/, '');

  useEffect(
    () => () => {
      if (burstTimer.current !== null) window.clearTimeout(burstTimer.current);
    },
    []
  );

  const showLikeBurst = useCallback(() => {
    setBurstNonce((current) => current + 1);
    if (burstTimer.current !== null) window.clearTimeout(burstTimer.current);
    burstTimer.current = window.setTimeout(() => {
      burstTimer.current = null;
      setBurstNonce(0);
    }, LIKE_BURST_MS);
  }, []);

  const toggleLike = useCallback(
    (forceLike = false) => {
      setIsLiked((current) => {
        if (forceLike) {
          if (!current) {
            setLikePulse((pulse) => pulse + 1);
            onLike?.();
          }
          return true;
        }
        if (!current) setLikePulse((pulse) => pulse + 1);
        onLike?.();
        return !current;
      });
      triggerHaptic(forceLike ? 'heavy' : 'light');
      if (forceLike) showLikeBurst();
    },
    [onLike, showLikeBurst, triggerHaptic]
  );

  const toggleUI = useCallback(() => {
    triggerHaptic('light');
    setIsUIVisible((current) => !current);
  }, [triggerHaptic]);

  const handlePhotoClick = useCallback(() => {
    const now = Date.now();
    if (now - lastTapAt.current <= DOUBLE_TAP_MS) {
      lastTapAt.current = 0;
      toggleLike(true);
      return;
    }
    lastTapAt.current = now;
    toggleUI();
  }, [toggleLike, toggleUI]);

  const isolateAction = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
  }, []);

  const handleShare = useCallback(async () => {
    if (onShare) {
      onShare();
      return;
    }
    const url = shareUrl || (typeof window === 'undefined' ? '' : window.location.href);
    const title = artistName || `@${handle}`;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url });
      } catch {
        return;
      }
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText && url) {
      await navigator.clipboard.writeText(url);
    }
  }, [artistName, handle, onShare, shareUrl]);

  const handleSave = useCallback(() => {
    setIsSaved((current) => !current);
    onSave?.();
  }, [onSave]);

  return (
    <article className="relative isolate h-[100dvh] w-screen overflow-hidden bg-black text-white">
      <button
        type="button"
        onClick={handlePhotoClick}
        className="absolute inset-0 z-0 h-full min-h-0 w-full cursor-pointer border-0 bg-transparent p-0"
        aria-label={isUIVisible ? 'Ocultar interface' : 'Mostrar interface'}
        aria-pressed={isUIVisible}
      >
        <OptimizedImage
          src={imageUrl || PLACEHOLDER_IMAGE}
          alt={handle}
          sizes="100vw"
          className="absolute inset-0 h-full w-full"
          priority
        />
      </button>

      <AnimatePresence>
        {burstNonce > 0 ? (
          <motion.div
            key={burstNonce}
            initial={{ opacity: 0, scale: 0.62 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.18 }}
            transition={{ type: 'spring', stiffness: 380, damping: 16 }}
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center transform-gpu"
          >
            <span className="drop-shadow-[0_0_28px_rgba(255,102,0,0.9)]">
              <TattooMachineLikeGlyph liked className="h-20 w-20 text-white" />
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div
        className={cn(
          'pointer-events-none absolute inset-0 z-10 transform-gpu will-change-[opacity]',
          'transition-opacity duration-300 ease-out',
          isUIVisible ? 'opacity-100' : 'opacity-0'
        )}
      >
        <div
          className={cn(
            'absolute inset-y-0 right-0 flex w-[5.5rem] items-center justify-end',
            'bg-gradient-to-l from-black/60 to-transparent',
            'pr-[max(0.75rem,env(safe-area-inset-right,0px))]',
            isUIVisible && 'pointer-events-auto'
          )}
        >
          <div className="flex flex-col items-center gap-5">
            <button
              type="button"
              onClick={(event) => {
                isolateAction(event);
                toggleLike(false);
              }}
              aria-label={isLiked ? 'Descurtir' : 'Curtir'}
              aria-pressed={isLiked}
              className="flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 bg-transparent p-0 text-white transform-gpu will-change-transform"
              style={{ transform: GRIP_CURVE[0] }}
            >
              <motion.span
                key={likePulse}
                initial={{ scale: 1 }}
                animate={{ scale: isLiked ? [1, 1.28, 1] : 1 }}
                transition={{ type: 'spring', stiffness: 420, damping: 12 }}
                className="inline-flex transform-gpu will-change-transform"
              >
                <TattooMachineLikeGlyph liked={isLiked} className="h-6 w-6 text-white" />
              </motion.span>
            </button>

            <button
              type="button"
              onClick={(event) => {
                isolateAction(event);
                triggerHaptic('light');
                handleSave();
              }}
              aria-label={isSaved ? 'Remover dos salvos' : 'Salvar'}
              aria-pressed={isSaved}
              className="flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 bg-transparent p-0 text-white transform-gpu will-change-transform"
              style={{ transform: GRIP_CURVE[1] }}
            >
              <Bookmark
                className="h-6 w-6 text-white"
                strokeWidth={1.75}
                fill={isSaved ? 'currentColor' : 'none'}
              />
            </button>

            <button
              type="button"
              onClick={(event) => {
                isolateAction(event);
                triggerHaptic('light');
                onQuote?.();
              }}
              aria-label="Orçamento"
              className="flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 bg-transparent p-0 text-white transform-gpu will-change-transform"
              style={{ transform: GRIP_CURVE[2] }}
            >
              <FileText className="h-6 w-6 text-white" strokeWidth={1.75} />
            </button>

            <button
              type="button"
              onClick={(event) => {
                isolateAction(event);
                triggerHaptic('light');
                void handleShare();
              }}
              aria-label="Compartilhar"
              className="flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 bg-transparent p-0 text-white transform-gpu will-change-transform"
              style={{ transform: GRIP_CURVE[3] }}
            >
              <Send className="h-6 w-6 text-white" strokeWidth={1.75} />
            </button>

            <button
              type="button"
              onClick={isolateAction}
              aria-label={`${viewsCount.toLocaleString('pt-BR')} visualizações`}
              className="flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 bg-transparent p-0 text-white transform-gpu will-change-transform"
              style={{ transform: GRIP_CURVE[4] }}
            >
              <Eye className="h-6 w-6 text-white" strokeWidth={1.75} />
              <span className="text-[10px] font-medium tabular-nums tracking-tight text-white">
                {formatViews(viewsCount)}
              </span>
            </button>
          </div>
        </div>

        <div
          className={cn(
            'absolute inset-x-0 bottom-0 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pr-[6.25rem]',
            'bg-gradient-to-t from-black/55 to-transparent pt-16'
          )}
        >
          <p className="truncate text-[15px] font-semibold tracking-tight text-white">@{handle}</p>
          {caption ? (
            <p className="mt-1 line-clamp-2 text-[13px] font-medium leading-snug text-white/85">
              {caption}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
