'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import { animate, motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { toggleSave } from '@/actions/saved-actions';
import { BudgetEstimatorSheet } from '@/components/features/budget-estimator-sheet';
import { ImmersivePhotoCard } from '@/components/features/immersive-photo-card';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useUiStore } from '@/hooks/use-ui-store';
import { artistProfileHref } from '@/lib/artist-profile';
import { PLACEHOLDER_INSPIRATIONS, type InspirationItem } from '@/lib/gallery-mock';
import { cn } from '@/lib/utils';

const WINDOW_RADIUS = 1;
const DISMISS_DISTANCE_PX = 100;
const DISMISS_VELOCITY_PX_S = 700;
const DISMISS_SCALE_MIN = 0.95;
const HEADER_NODES_SELECTOR = '[data-app-header], [data-header-follow]';
const HEADER_HIDDEN_CLASS = 'is-header-hidden';
const TRACK_SPRING = { type: 'spring', stiffness: 300, damping: 30 } as const;
const PAGE_VELOCITY_PX_S = 400;
const PAGE_OFFSET_RATIO = 0.2;
const PAGE_DRAG_ELASTIC = 0.18;
const GESTURE_TAP_LOCK_MS = 220;
const GESTURE_DRAG_PX = 8;
const DISMISS_DRAG_ELASTIC = 0.22;
const DISMISS_EASE = [0.32, 0.72, 0, 1] as const;

export type ImmersivePhotoFeedItem = InspirationItem & {
  liked?: boolean;
  saved?: boolean;
};

function inspirationShareUrl(item: ImmersivePhotoFeedItem): string {
  const href = artistProfileHref({ id: item.artistId, username: item.artistUsername });
  if (typeof window === 'undefined') return href;
  return `${window.location.origin}${href}`;
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isUIVisible, setIsUIVisible] = useState(true);
  const [viewportH, setViewportH] = useState(() =>
    typeof window === 'undefined'
      ? 1
      : Math.max(window.visualViewport?.height || 0, window.innerHeight || 0, 1)
  );
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [budgetItem, setBudgetItem] = useState<ImmersivePhotoFeedItem | null>(null);
  const [, startSaveTransition] = useTransition();
  const isUIVisibleRef = useRef(true);
  const dismissingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const dragLockUntilRef = useRef(0);
  const viewportHRef = useRef(
    typeof window === 'undefined'
      ? 1
      : Math.max(window.visualViewport?.height || 0, window.innerHeight || 0, 1)
  );
  const scrollerRef = useRef<HTMLDivElement>(null);
  const trackY = useMotionValue(0);
  const dismissProgress = useMotionValue(0);
  const setStoreHeaderHidden = useUiStore((state) => state.setHeaderHidden);

  useEffect(() => {
    document.querySelectorAll<HTMLElement>(HEADER_NODES_SELECTOR).forEach((node) => {
      node.classList.add(HEADER_HIDDEN_CLASS);
    });
    setStoreHeaderHidden(true);
    return () => {
      document.querySelectorAll<HTMLElement>(HEADER_NODES_SELECTOR).forEach((node) => {
        node.classList.remove(HEADER_HIDDEN_CLASS);
      });
      setStoreHeaderHidden(false);
    };
  }, [setStoreHeaderHidden]);

  const overlayScreenHeight = useCallback(() => {
    if (typeof window === 'undefined') return 1;
    return Math.max(window.visualViewport?.height || 0, window.innerHeight || 0, 1);
  }, []);

  const restTrackY = useCallback((index: number, height: number) => -index * height, []);

  const lockGesture = useCallback(() => {
    isDraggingRef.current = true;
    dragLockUntilRef.current = Number.POSITIVE_INFINITY;
  }, []);

  const unlockGesture = useCallback((didDrag = true) => {
    isDraggingRef.current = false;
    dragLockUntilRef.current = didDrag ? Date.now() + GESTURE_TAP_LOCK_MS : 0;
  }, []);

  const isGestureLocked = useCallback(
    () => isDraggingRef.current || Date.now() < dragLockUntilRef.current,
    []
  );

  const handleUIVisibleChange = useCallback((visible: boolean) => {
    if (isDraggingRef.current || Date.now() < dragLockUntilRef.current) return;
    isUIVisibleRef.current = visible;
    setIsUIVisible(visible);
    if (visible && !dismissingRef.current) {
      dismissProgress.set(0);
    }
  }, [dismissProgress]);

  const finishDismiss = useCallback(() => {
    triggerHaptic('medium');
    onClose?.();
  }, [onClose, triggerHaptic]);

  const feedItems = useMemo<readonly ImmersivePhotoFeedItem[]>(
    () => (items && items.length > 0 ? items : PLACEHOLDER_INSPIRATIONS),
    [items]
  );

  const totalItems = feedItems.length;
  const maxPageIndex = Math.max(totalItems - 1, 0);
  const pageIndex = Math.max(0, Math.min(currentIndex, maxPageIndex));
  const pageIndexRef = useRef(pageIndex);

  const commitPageIndex = useCallback((next: number) => {
    const bounded = Math.max(0, Math.min(next, Math.max(totalItems - 1, 0)));
    pageIndexRef.current = bounded;
    setCurrentIndex(bounded);
    return bounded;
  }, [totalItems]);

  useEffect(() => {
    pageIndexRef.current = pageIndex;
  }, [pageIndex]);

  useEffect(() => {
    const node = scrollerRef.current;
    const syncViewport = () => {
      const next = Math.max(node?.clientHeight || 0, overlayScreenHeight());
      viewportHRef.current = next;
      setViewportH((current) => (current === next ? current : next));
      if (!isDraggingRef.current) {
        trackY.set(restTrackY(pageIndexRef.current, next));
      }
    };
    syncViewport();
    if (!node || typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', syncViewport);
      window.visualViewport?.addEventListener('resize', syncViewport);
      return () => {
        window.removeEventListener('resize', syncViewport);
        window.visualViewport?.removeEventListener('resize', syncViewport);
      };
    }
    const observer = new ResizeObserver(syncViewport);
    observer.observe(node);
    return () => observer.disconnect();
  }, [overlayScreenHeight, restTrackY, trackY]);

  const pageDragConstraints = useMemo(() => {
    const rest = restTrackY(pageIndex, viewportH);
    return {
      top: Math.max(rest - viewportH, restTrackY(maxPageIndex, viewportH)),
      bottom: Math.min(rest + viewportH, 0),
    };
  }, [maxPageIndex, pageIndex, restTrackY, viewportH]);

  const handlePageDrag = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (!isUIVisibleRef.current || dismissingRef.current) return;
      if (Math.abs(info.offset.y) >= GESTURE_DRAG_PX) lockGesture();
    },
    [lockGesture]
  );

  const handlePageDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const didDrag = Math.abs(info.offset.y) >= GESTURE_DRAG_PX;
      unlockGesture(didDrag);
      const height = viewportHRef.current || overlayScreenHeight();
      const index = pageIndexRef.current;
      if (!isUIVisibleRef.current || dismissingRef.current) {
        void animate(trackY, restTrackY(index, height), TRACK_SPRING);
        return;
      }
      const offsetY = info.offset.y;
      const velocityY = info.velocity.y;
      const offsetPass = Math.abs(offsetY) >= height * PAGE_OFFSET_RATIO;
      const velocityPass = Math.abs(velocityY) >= PAGE_VELOCITY_PX_S;
      let next = index;
      if (offsetPass || velocityPass) {
        const goingNext = offsetPass ? offsetY < 0 : velocityY < 0;
        next = goingNext ? index + 1 : index - 1;
      }
      const bounded = commitPageIndex(next);
      void animate(trackY, restTrackY(bounded, height), TRACK_SPRING);
    },
    [commitPageIndex, overlayScreenHeight, restTrackY, trackY, unlockGesture]
  );

  const handleDismissDrag = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (isUIVisibleRef.current || dismissingRef.current) return;
      if (Math.abs(info.offset.y) >= GESTURE_DRAG_PX) lockGesture();
      const height = overlayScreenHeight();
      dismissProgress.set(Math.min(1, Math.abs(info.offset.y) / height));
    },
    [dismissProgress, lockGesture, overlayScreenHeight]
  );

  const handleDismissDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const didDrag = Math.abs(info.offset.y) >= GESTURE_DRAG_PX;
      unlockGesture(didDrag);
      if (isUIVisibleRef.current || dismissingRef.current) return;
      const shouldDismiss =
        Boolean(onClose) &&
        (Math.abs(info.offset.y) >= DISMISS_DISTANCE_PX ||
          Math.abs(info.velocity.y) >= DISMISS_VELOCITY_PX_S);
      if (!shouldDismiss) {
        void animate(dismissProgress, 0, TRACK_SPRING);
        return;
      }
      dismissingRef.current = true;
      void animate(dismissProgress, 1, {
        duration: 0.22,
        ease: DISMISS_EASE,
      }).then(finishDismiss);
    },
    [dismissProgress, finishDismiss, onClose, unlockGesture]
  );

  const dismissScale = useTransform(dismissProgress, [0, 1], [1, DISMISS_SCALE_MIN]);
  const backdropOpacity = useTransform(dismissProgress, [0, 1], [1, 0]);

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

  return (
    <>
      <div className="fixed inset-0 z-[100] h-[100dvh] w-full overflow-hidden">
        <motion.div
          className="absolute inset-0 transform-gpu will-change-[opacity]"
          style={{ backgroundColor: '#000', opacity: backdropOpacity }}
        />
        <motion.div
          className="relative h-[100dvh] w-full transform-gpu will-change-transform [backface-visibility:hidden]"
          style={{ scale: dismissScale }}
          drag={!isUIVisible ? 'y' : false}
          dragDirectionLock
          dragListener={!isUIVisible}
          dragElastic={DISMISS_DRAG_ELASTIC}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragMomentum={false}
          onDrag={handleDismissDrag}
          onDragEnd={handleDismissDragEnd}
        >
          <div
            ref={scrollerRef}
            className={cn(
              'relative h-[100dvh] w-full overflow-hidden p-0 m-0 touch-none scrollbar-none',
              'overscroll-none transform-gpu',
              className
            )}
            onClickCapture={(event) => {
              if (!isGestureLocked()) return;
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            <motion.div
              className="flex w-full flex-col gap-0 space-y-0 transform-gpu will-change-transform [backface-visibility:hidden]"
              style={{ y: trackY }}
              drag={isUIVisible ? 'y' : false}
              dragDirectionLock
              dragListener={isUIVisible}
              dragElastic={PAGE_DRAG_ELASTIC}
              dragConstraints={pageDragConstraints}
              dragMomentum={false}
              onDrag={handlePageDrag}
              onDragEnd={handlePageDragEnd}
            >
              {feedItems.map((item, index) => {
                const mounted = Math.abs(index - pageIndex) <= WINDOW_RADIUS;
                const handle = item.artistUsername || item.artistName;
                return (
                  <div
                    key={item.id}
                    className="h-[100dvh] w-full flex-shrink-0 overflow-hidden transform-gpu"
                    style={{ contain: 'layout paint size' }}
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
                        onUIVisibleChange={index === pageIndex ? handleUIVisibleChange : undefined}
                        isGestureLocked={isGestureLocked}
                      />
                    ) : null}
                  </div>
                );
              })}
            </motion.div>
          </div>
        </motion.div>
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
