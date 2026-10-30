'use client';

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bookmark, Eye, FileText, Heart, ImageIcon, Layers, Send, Video, X } from 'lucide-react';
import { AtomicRefreshButton } from '@/components/features/atomic-refresh-button';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { TattooMachineLikeGlyph } from '@/components/ui/tattoo-like-button';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { DEFAULT_MEDIA_FILTER, type MediaFilter } from '@/lib/media-filter';
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
const TAP_MAX_MS = 200;
const TAP_MAX_PX = 10;
const TITANIUM_SHADOW =
  'drop-shadow(0px 1px 1.5px rgba(0,0,0,0.9)) drop-shadow(0px 4px 10px rgba(0,0,0,0.5))';
const ACTION_BTN =
  'flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 bg-transparent p-0 transform-gpu will-change-transform';
const ACTION_ICON = 'h-6 w-6';

const MEDIA_TYPES: readonly { id: MediaFilter; label: string; Icon: typeof ImageIcon }[] = [
  { id: 'photo', label: 'Foto', Icon: ImageIcon },
  { id: 'all', label: 'Tudo', Icon: Layers },
  { id: 'video', label: 'Vídeo', Icon: Video },
] as const;

const SWITCHER_SPRING = { type: 'spring', stiffness: 420, damping: 34, mass: 0.7 } as const;

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
  onClose?: () => void;
  onUIVisibleChange?: (visible: boolean) => void;
  isGestureLocked?: () => boolean;
  mediaType?: MediaFilter;
  onMediaTypeChange?: (next: MediaFilter) => void;
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
  onClose,
  onUIVisibleChange,
  isGestureLocked,
  mediaType = DEFAULT_MEDIA_FILTER,
  onMediaTypeChange,
}: ImmersivePhotoCardProps) {
  const { triggerHaptic } = useHapticFeedback();
  const [isUIVisible, setIsUIVisible] = useState(true);
  const [isLiked, setIsLiked] = useState(liked);
  const [isSaved, setIsSaved] = useState(saved);
  const [likePulse, setLikePulse] = useState(0);
  const [burstNonce, setBurstNonce] = useState(0);
  const lastTapAt = useRef(0);
  const burstTimer = useRef<number | null>(null);
  const pointerStart = useRef<{ x: number; y: number; t: number; id: number } | null>(null);
  const handle = username.replace(/^@+/, '');
  const holoId = `titanium-holo-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

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

  useEffect(() => {
    onUIVisibleChange?.(isUIVisible);
  }, [isUIVisible, onUIVisibleChange]);

  const commitIntentionalTap = useCallback(() => {
    if (isGestureLocked?.()) return;
    const now = Date.now();
    if (now - lastTapAt.current <= DOUBLE_TAP_MS) {
      lastTapAt.current = 0;
      toggleLike(true);
      return;
    }
    lastTapAt.current = now;
    toggleUI();
  }, [isGestureLocked, toggleLike, toggleUI]);

  const handlePointerDown = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointerStart.current = {
      x: event.clientX,
      y: event.clientY,
      t: Date.now(),
      id: event.pointerId,
    };
  }, []);

  const handlePointerUp = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      const start = pointerStart.current;
      pointerStart.current = null;
      if (!start || start.id !== event.pointerId) return;
      if (isGestureLocked?.()) return;
      const deltaX = event.clientX - start.x;
      const deltaY = event.clientY - start.y;
      const deltaTime = Date.now() - start.t;
      if (deltaTime >= TAP_MAX_MS) return;
      if (Math.abs(deltaX) >= TAP_MAX_PX || Math.abs(deltaY) >= TAP_MAX_PX) return;
      commitIntentionalTap();
    },
    [commitIntentionalTap, isGestureLocked]
  );

  const handlePointerCancel = useCallback(() => {
    pointerStart.current = null;
  }, []);

  const handlePhotoKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      commitIntentionalTap();
    },
    [commitIntentionalTap]
  );

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
    <article
      className="relative isolate m-0 h-[100dvh] w-full overflow-hidden bg-black p-0 text-white"
      style={{ contain: 'layout paint size' }}
    >
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onKeyDown={handlePhotoKeyDown}
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

      <svg aria-hidden focusable="false" className="absolute h-0 w-0 overflow-hidden" width={0} height={0}>
        <defs>
          <linearGradient id={holoId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="50%" stopColor="#E2E8F0" />
            <stop offset="100%" stopColor="#A5F3FC" />
          </linearGradient>
        </defs>
      </svg>

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
        {onClose ? (
          <button
            type="button"
            onClick={(event) => {
              isolateAction(event);
              triggerHaptic('light');
              onClose();
            }}
            aria-label="Fechar"
            className={cn(
              'absolute left-[max(0.5rem,env(safe-area-inset-left,0px))] z-20 flex min-h-11 min-w-11 items-center justify-center bg-transparent p-0 text-white',
              'drop-shadow-[0_1px_8px_rgba(0,0,0,0.75)] transform-gpu will-change-transform',
              isUIVisible ? 'pointer-events-auto' : 'pointer-events-none'
            )}
            style={{ top: 'max(0.5rem, env(safe-area-inset-top, 0px))' }}
          >
            <X className="h-6 w-6 text-white" strokeWidth={1.75} />
          </button>
        ) : null}

        <div
          className={cn(
            'absolute inset-y-0 right-0 flex w-[5.5rem] items-center justify-end',
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
              className={ACTION_BTN}
              style={{ transform: GRIP_CURVE[0], filter: TITANIUM_SHADOW }}
            >
              <motion.span
                key={likePulse}
                initial={{ scale: 1 }}
                animate={{ scale: isLiked ? [1, 1.28, 1] : 1 }}
                transition={{ type: 'spring', stiffness: 420, damping: 12 }}
                className="inline-flex transform-gpu will-change-transform"
              >
                <Heart
                  className={ACTION_ICON}
                  stroke={`url(#${holoId})`}
                  strokeWidth={2}
                  fill="none"
                />
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
              className={ACTION_BTN}
              style={{ transform: GRIP_CURVE[1], filter: TITANIUM_SHADOW }}
            >
              <Bookmark
                className={ACTION_ICON}
                stroke={`url(#${holoId})`}
                strokeWidth={2}
                fill="none"
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
              className={ACTION_BTN}
              style={{ transform: GRIP_CURVE[2], filter: TITANIUM_SHADOW }}
            >
              <FileText
                className={ACTION_ICON}
                stroke={`url(#${holoId})`}
                strokeWidth={2}
                fill="none"
              />
            </button>

            <button
              type="button"
              onClick={(event) => {
                isolateAction(event);
                triggerHaptic('light');
                void handleShare();
              }}
              aria-label="Compartilhar"
              className={ACTION_BTN}
              style={{ transform: GRIP_CURVE[3], filter: TITANIUM_SHADOW }}
            >
              <Send
                className={ACTION_ICON}
                stroke={`url(#${holoId})`}
                strokeWidth={2}
                fill="none"
              />
            </button>

            <button
              type="button"
              onClick={isolateAction}
              aria-label={`${viewsCount.toLocaleString('pt-BR')} visualizações`}
              className={ACTION_BTN}
              style={{ transform: GRIP_CURVE[4], filter: TITANIUM_SHADOW }}
            >
              <Eye
                className={ACTION_ICON}
                stroke={`url(#${holoId})`}
                strokeWidth={2}
                fill="none"
              />
              <span
                className="text-[10px] font-medium tabular-nums tracking-tight"
                style={{
                  color: '#E2E8F0',
                  filter: TITANIUM_SHADOW,
                }}
              >
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

      <AnimatePresence>
        {!isUIVisible ? (
          <motion.div
            key="ghost-chrome"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={SWITCHER_SPRING}
            className="pointer-events-none absolute inset-0 z-30 transform-gpu will-change-transform"
          >
            <AtomicRefreshButton holoId={holoId} />
            <div
              className={cn(
                'pointer-events-none absolute z-30 flex items-end justify-start',
                'left-[max(1rem,env(safe-area-inset-left,0px))]',
                'bottom-[max(1.5rem,env(safe-area-inset-bottom,0px))]'
              )}
            >
              <div
                role="group"
                aria-label="Alternar tipo de mídia"
                data-no-dismiss
                className={cn(
                  'pointer-events-auto relative flex items-center gap-0.5 rounded-full px-1 py-1',
                  'border border-white/10 bg-white/5 backdrop-blur-xl transform-gpu',
                  'shadow-[0_1px_1px_rgba(255,255,255,0.08)_inset,0_8px_24px_rgba(0,0,0,0.28)]'
                )}
                style={{ filter: TITANIUM_SHADOW }}
              >
                {MEDIA_TYPES.map(({ id, label, Icon }) => {
                  const active = mediaType === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      data-no-dismiss
                      onClick={() => {
                        if (active) return;
                        onMediaTypeChange?.(id);
                      }}
                      aria-label={label}
                      aria-pressed={active}
                      className={cn(
                        'relative flex min-h-11 min-w-11 items-center justify-center rounded-full px-3',
                        'transform-gpu transition-colors duration-200 ease-out',
                        active ? 'text-white' : 'text-white/60'
                      )}
                    >
                      {active ? (
                        <motion.div
                          layoutId="active-media-pill"
                          transition={SWITCHER_SPRING}
                          aria-hidden
                          className="absolute inset-0 rounded-full border border-white/25 bg-white/10 transform-gpu"
                        />
                      ) : null}
                      <Icon
                        className="relative z-10 h-4 w-4"
                        stroke={`url(#${holoId})`}
                        strokeWidth={2}
                        fill="none"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </article>
  );
}
