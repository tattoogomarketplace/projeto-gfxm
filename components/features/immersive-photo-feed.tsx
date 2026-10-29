'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { toggleSave } from '@/actions/saved-actions';
import { BudgetEstimatorSheet } from '@/components/features/budget-estimator-sheet';
import { ImmersivePhotoCard } from '@/components/features/immersive-photo-card';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { artistProfileHref } from '@/lib/artist-profile';
import { PLACEHOLDER_INSPIRATIONS, type InspirationItem } from '@/lib/gallery-mock';
import { cn } from '@/lib/utils';

const WINDOW_RADIUS = 1;
const DISMISS_DISTANCE_PX = 100;
const DISMISS_VELOCITY_PX_MS = 0.7;
const DRAG_ACTIVATE_PX = 10;
const DISMISS_MS = 380;
const SNAP_MS = 320;
const RUBBER = 0.72;
const FULL_BLEED_RATIO = 0.85;
const SNAP_EASE = 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)';
const SNAP_BACKDROP_EASE = 'background-color 320ms ease-out';
const DISMISS_EASE = 'transform 380ms cubic-bezier(0.32, 0.72, 0, 1)';
const DISMISS_BACKDROP_EASE = 'background-color 380ms ease-out';

export type ImmersivePhotoFeedItem = InspirationItem & {
  liked?: boolean;
  saved?: boolean;
};

function inspirationShareUrl(item: ImmersivePhotoFeedItem): string {
  const href = artistProfileHref({ id: item.artistId, username: item.artistUsername });
  if (typeof window === 'undefined') return href;
  return `${window.location.origin}${href}`;
}

function isOverlayChrome(target: EventTarget | null, scroller: HTMLDivElement): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest('a, input, textarea, [data-no-dismiss]')) return true;
  const button = target.closest('button');
  if (!button) return false;
  const rect = button.getBoundingClientRect();
  const host = scroller.getBoundingClientRect();
  const fullBleed =
    rect.width >= host.width * FULL_BLEED_RATIO && rect.height >= host.height * FULL_BLEED_RATIO;
  return !fullBleed;
}

export function ImmersivePhotoFeed({
  items,
  className,
  onClose,
}: {
  items?: readonly ImmersivePhotoFeedItem[];
  className?: string;
  onClose?: () => void;
}) {
  const router = useRouter();
  const { triggerHaptic } = useHapticFeedback();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);
  const settleTimer = useRef<number | null>(null);
  const dragRef = useRef({
    pointerId: -1,
    startY: 0,
    startX: 0,
    lastY: 0,
    lastAt: 0,
    offset: 0,
    raw: 0,
    velocity: 0,
    active: false,
    dismissing: false,
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [budgetItem, setBudgetItem] = useState<ImmersivePhotoFeedItem | null>(null);
  const [, startSaveTransition] = useTransition();

  const overlayScreenHeight = useCallback(() => {
    if (typeof window === 'undefined') return 1;
    return Math.max(window.innerHeight || 0, 1);
  }, []);

  const applyDragTransform = useCallback((deltaY: number) => {
    const node = shellRef.current;
    const backdrop = backdropRef.current;
    const screenHeight = overlayScreenHeight();
    const opacity = Math.max(0, 1 - (deltaY / screenHeight));
    if (node) node.style.transform = `translate3d(0, ${deltaY}px, 0)`;
    if (backdrop) backdrop.style.backgroundColor = `rgba(0,0,0,${opacity})`;
  }, [overlayScreenHeight]);

  const lockScroller = useCallback((locked: boolean) => {
    const scroller = scrollerRef.current;
    const shell = shellRef.current;
    if (scroller) {
      scroller.style.overflowY = locked ? 'hidden' : '';
      scroller.style.touchAction = locked ? 'none' : '';
    }
    if (shell) {
      shell.style.touchAction = locked ? 'none' : '';
    }
  }, []);

  const suppressNextClick = useCallback(() => {
    const suppress = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
    };
    document.addEventListener('click', suppress, true);
    window.setTimeout(() => document.removeEventListener('click', suppress, true), 450);
  }, []);

  const finishDismiss = useCallback(() => {
    triggerHaptic('medium');
    onClose?.();
  }, [onClose, triggerHaptic]);

  useEffect(() => {
    const timer = settleTimer;
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  const feedItems = useMemo<readonly ImmersivePhotoFeedItem[]>(
    () => (items && items.length > 0 ? items : PLACEHOLDER_INSPIRATIONS),
    [items]
  );

  const onScroll = useCallback(() => {
    const node = scrollerRef.current;
    if (!node || frameRef.current) return;
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = 0;
      const height = Math.max(node.clientHeight, 1);
      const next = Math.round(node.scrollTop / height);
      const clamped = Math.max(0, Math.min(feedItems.length - 1, next));
      setActiveIndex((current) => (current === clamped ? current : clamped));
    });
  }, [feedItems.length]);

  const toggleLiked = useCallback((id: string, fallback = false) => {
    setLiked((prev) => ({ ...prev, [id]: !(prev[id] ?? fallback) }));
  }, []);

  const persistToggleSave = useCallback((postId: string, fallback = false) => {
    setSaved((prev) => ({ ...prev, [postId]: !(prev[postId] ?? fallback) }));
    startSaveTransition(async () => {
      const result = await toggleSave(postId);
      if (!result.success) return;
      setSaved((prev) => ({ ...prev, [postId]: result.isSaved }));
    });
  }, []);

  const shareInspiration = useCallback((item: ImmersivePhotoFeedItem) => {
    const url = inspirationShareUrl(item);
    const title = item.artistName;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      void navigator.share({ title, url }).catch(() => undefined);
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(url);
    }
  }, []);

  const openBudget = useCallback((item: ImmersivePhotoFeedItem) => {
    setBudgetItem(item);
  }, []);

  const closeBudget = useCallback(() => setBudgetItem(null), []);

  const startQuoteChat = useCallback(
    ({ artistId, artworkId }: { artistId: string; artworkId: string }) => {
      setBudgetItem(null);
      if (!artistId) return;
      const params = new URLSearchParams({ artistId, artworkId });
      router.push(`/dashboard/chat?${params.toString()}`);
    },
    [router]
  );

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (dragRef.current.dismissing) return;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    if (isOverlayChrome(event.target, scroller)) return;
    dragRef.current.pointerId = event.pointerId;
    dragRef.current.startY = event.clientY;
    dragRef.current.startX = event.clientX;
    dragRef.current.lastY = event.clientY;
    dragRef.current.lastAt = event.timeStamp;
    dragRef.current.offset = 0;
    dragRef.current.raw = 0;
    dragRef.current.velocity = 0;
    dragRef.current.active = false;
  }, []);

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (drag.pointerId !== event.pointerId || drag.dismissing) return;
      const scroller = scrollerRef.current;
      const shell = shellRef.current;
      if (!scroller || !shell) return;

      const deltaY = event.clientY - drag.startY;
      const deltaX = event.clientX - drag.startX;
      const atTop = scroller.scrollTop <= 0;

      if (!drag.active) {
        if (deltaY < -DRAG_ACTIVATE_PX || Math.abs(deltaX) > Math.max(deltaY, DRAG_ACTIVATE_PX)) {
          drag.pointerId = -1;
          lockScroller(false);
          return;
        }
        if (deltaY < DRAG_ACTIVATE_PX) return;
        if (Math.abs(deltaX) > deltaY) {
          drag.pointerId = -1;
          lockScroller(false);
          return;
        }
        if (!atTop) {
          lockScroller(false);
          return;
        }
        drag.active = true;
        shell.style.transition = 'none';
        if (backdropRef.current) backdropRef.current.style.transition = 'none';
        lockScroller(true);
        try {
          scroller.setPointerCapture(event.pointerId);
        } catch {
          void 0;
        }
      }

      event.preventDefault();
      const dt = Math.max(1, event.timeStamp - drag.lastAt);
      drag.velocity = (event.clientY - drag.lastY) / dt;
      drag.lastY = event.clientY;
      drag.lastAt = event.timeStamp;
      const raw = Math.max(0, deltaY);
      const offset = raw * RUBBER;
      drag.raw = raw;
      drag.offset = offset;
      applyDragTransform(offset);
    },
    [applyDragTransform, lockScroller]
  );

  const releaseSwipe = useCallback(
    (pointerId: number) => {
      const drag = dragRef.current;
      if (drag.pointerId !== pointerId) return;
      const scroller = scrollerRef.current;
      const shell = shellRef.current;
      if (scroller) {
        try {
          scroller.releasePointerCapture(pointerId);
        } catch {
          void 0;
        }
      }
      drag.pointerId = -1;

      if (!drag.active || drag.dismissing) {
        lockScroller(false);
        return;
      }
      drag.active = false;
      suppressNextClick();

      const shouldDismiss =
        Boolean(onClose) &&
        (drag.raw >= DISMISS_DISTANCE_PX || drag.velocity >= DISMISS_VELOCITY_PX_MS);

      if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);

      if (shouldDismiss) {
        drag.dismissing = true;
        lockScroller(true);
        const viewportH = overlayScreenHeight();
        if (shell) {
          shell.style.transition = DISMISS_EASE;
          if (backdropRef.current) backdropRef.current.style.transition = DISMISS_BACKDROP_EASE;
          applyDragTransform(viewportH);
        }
        settleTimer.current = window.setTimeout(finishDismiss, shell ? DISMISS_MS : 0);
        return;
      }

      lockScroller(false);
      if (shell) {
        shell.style.transition = SNAP_EASE;
        if (backdropRef.current) backdropRef.current.style.transition = SNAP_BACKDROP_EASE;
        applyDragTransform(0);
      }
      settleTimer.current = window.setTimeout(() => {
        if (dragRef.current.dismissing || !shell) return;
        shell.style.transition = 'none';
        if (backdropRef.current) backdropRef.current.style.transition = 'none';
        applyDragTransform(0);
      }, SNAP_MS);
    },
    [applyDragTransform, finishDismiss, lockScroller, onClose, overlayScreenHeight, suppressNextClick]
  );

  const onPointerEnd = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      releaseSwipe(event.pointerId);
    },
    [releaseSwipe]
  );

  useEffect(() => {
    const handleRelease = (event: PointerEvent) => {
      releaseSwipe(event.pointerId);
    };
    const blockNativeOverscroll = (event: TouchEvent) => {
      if (!dragRef.current.active) return;
      if (event.cancelable) event.preventDefault();
    };
    window.addEventListener('pointerup', handleRelease);
    window.addEventListener('pointercancel', handleRelease);
    document.addEventListener('touchmove', blockNativeOverscroll, { passive: false });
    return () => {
      window.removeEventListener('pointerup', handleRelease);
      window.removeEventListener('pointercancel', handleRelease);
      document.removeEventListener('touchmove', blockNativeOverscroll);
    };
  }, [releaseSwipe]);

  return (
    <>
      <div className="fixed inset-0 z-[100] h-[100dvh] w-full overflow-hidden">
        <div
          ref={backdropRef}
          className="absolute inset-0 transform-gpu will-change-[background-color]"
          style={{ backgroundColor: 'rgba(0,0,0,1)' }}
        />
        <div
          ref={shellRef}
          className="relative h-[100dvh] w-full transform-gpu will-change-transform [backface-visibility:hidden] [transform:translate3d(0,0,0)]"
        >
          <div
            ref={scrollerRef}
            onScroll={onScroll}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            className={cn(
              'flex h-[100dvh] w-full flex-col overflow-y-scroll snap-y snap-mandatory scrollbar-none',
              'overscroll-y-contain [-webkit-overflow-scrolling:touch]',
              'transform-gpu touch-pan-y',
              className
            )}
          >
            {feedItems.map((item, index) => {
              const mounted = Math.abs(index - activeIndex) <= WINDOW_RADIUS;
              const handle = item.artistUsername || item.artistName;
              return (
                <div
                  key={item.id}
                  className="h-[100dvh] w-full flex-shrink-0 snap-start snap-always overflow-hidden transform-gpu [contain:layout_size_style]"
                >
                  {mounted ? (
                    <ImmersivePhotoCard
                      imageUrl={item.imageUrl}
                      username={handle}
                      artistName={item.artistName}
                      caption={item.description || item.style}
                      viewsCount={item.viewsCount ?? 0}
                      liked={Boolean(liked[item.id] ?? item.liked)}
                      saved={Boolean(saved[item.id] ?? item.saved)}
                      shareUrl={inspirationShareUrl(item)}
                      onLike={() => toggleLiked(item.id, item.liked)}
                      onSave={() => persistToggleSave(item.id, item.saved)}
                      onQuote={() => openBudget(item)}
                      onShare={() => shareInspiration(item)}
                      onClose={onClose}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <BudgetEstimatorSheet
        open={Boolean(budgetItem)}
        item={
          budgetItem
            ? {
                id: budgetItem.id,
                style: budgetItem.style,
                artistName: budgetItem.artistName,
                artistId: budgetItem.artistId,
                artistUsername: budgetItem.artistUsername,
                location: budgetItem.location,
                imageUrl: budgetItem.imageUrl,
              }
            : null
        }
        onClose={closeBudget}
        onRequestQuote={startQuoteChat}
        onQuoteAlternative={startQuoteChat}
      />
    </>
  );
}
