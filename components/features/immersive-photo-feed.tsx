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
import { BrandLogo } from '@/components/brand/brand-logo';
import { BudgetEstimatorSheet } from '@/components/features/budget-estimator-sheet';
import { ImmersivePhotoCard } from '@/components/features/immersive-photo-card';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useUiStore } from '@/hooks/use-ui-store';
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
const HEADER_VELOCITY_PX_MS = 0.5;
const HEADER_DRAG_DEAD_ZONE_PX = 10;
const HEADER_FALLBACK_HEIGHT_PX = 44;
const HEADER_TRANSITION = 'transform 200ms ease-out, opacity 200ms ease-out';
const HEADER_NODES_SELECTOR = '[data-app-header], [data-header-follow]';
const HEADER_HIDDEN_CLASS = 'is-header-hidden';

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
  const headerRef = useRef<HTMLElement>(null);
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
    dir: 1,
    active: false,
    dismissing: false,
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const [isUIVisible, setIsUIVisible] = useState(true);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [budgetItem, setBudgetItem] = useState<ImmersivePhotoFeedItem | null>(null);
  const [, startSaveTransition] = useTransition();
  const isUIVisibleRef = useRef(true);
  const headerCollapsedRef = useRef(false);
  const headerSettleTimer = useRef<number | null>(null);
  const headerMotorRef = useRef({
    touchId: -1,
    originX: 0,
    originY: 0,
    lastY: 0,
    lastAt: 0,
    velocity: 0,
    translate: 0,
    baseTranslate: 0,
    height: 0,
    active: false,
    axisLocked: false,
  });
  const setStoreHeaderHidden = useUiStore((state) => state.setHeaderHidden);

  const resolveHeaderHeight = useCallback(() => {
    const node = headerRef.current;
    const measured = node ? node.getBoundingClientRect().height : 0;
    return Math.max(measured || HEADER_FALLBACK_HEIGHT_PX, 1);
  }, []);

  // CANAL ÚNICO DE ANIMAÇÃO (offset 0 = visível, offset = altura = oculto).
  //
  // O Tailwind v4 compila `translate-y-*` para a propriedade CSS `translate`,
  // enquanto o motor de toque escreve `transform`. Como as duas propriedades
  // se COMPÕEM, o header colapsado recebia `translate: -100%` + `transform:
  // -height` (~-200%) e parecia travado sobre a foto, ignorando o dedo. Aqui
  // todas as escritas passam por `transform`/`opacity` inline, então estado de
  // Ghost UI, scroll e delta de toque compartilham o mesmo eixo e nunca somam.
  const paintHeader = useCallback(
    (offsetPx: number, animate: boolean) => {
      const node = headerRef.current;
      if (!node) return;
      const height = headerMotorRef.current.height || resolveHeaderHeight();
      const clamped = Math.min(height, Math.max(0, offsetPx));
      const progress = Math.min(1, clamped / height);
      node.style.transition = animate ? HEADER_TRANSITION : 'none';
      node.style.transform = `translate3d(0, ${-clamped}px, 0)`;
      node.style.opacity = `${1 - progress}`;
    },
    [resolveHeaderHeight]
  );

  const paintHeaderCollapsed = useCallback(
    (hidden: boolean, animate: boolean) => {
      paintHeader(hidden ? resolveHeaderHeight() : 0, animate);
    },
    [paintHeader, resolveHeaderHeight]
  );

  const applyHeaderCollapse = useCallback(
    (hidden: boolean) => {
      if (headerCollapsedRef.current === hidden) return;
      headerCollapsedRef.current = hidden;
      setIsHeaderCollapsed(hidden);
      document.querySelectorAll<HTMLElement>(HEADER_NODES_SELECTOR).forEach((node) => {
        node.classList.toggle(HEADER_HIDDEN_CLASS, hidden);
      });
      setStoreHeaderHidden(hidden);
      if (!headerMotorRef.current.active) paintHeaderCollapsed(hidden, true);
    },
    [paintHeaderCollapsed, setStoreHeaderHidden]
  );

  useEffect(() => {
    // ENTRY LOCK: a thread imersiva é dona do estado do header enquanto estiver
    // montada. Qualquer classe de header oculto herdada do feed de origem
    // (ex.: scroll para baixo no Início) é limpa no primeiro frame, antes de o
    // usuário interagir com a galeria em tela cheia.
    document.querySelectorAll<HTMLElement>(HEADER_NODES_SELECTOR).forEach((node) => {
      node.classList.remove(HEADER_HIDDEN_CLASS);
    });
    setStoreHeaderHidden(false);
    return () => {
      document.querySelectorAll<HTMLElement>(HEADER_NODES_SELECTOR).forEach((node) => {
        node.classList.remove(HEADER_HIDDEN_CLASS);
      });
      setStoreHeaderHidden(false);
    };
  }, [setStoreHeaderHidden]);

  useEffect(() => {
    applyHeaderCollapse(!isUIVisible);
  }, [applyHeaderCollapse, isUIVisible]);

  const handleUIVisibleChange = useCallback((visible: boolean) => {
    isUIVisibleRef.current = visible;
    setIsUIVisible(visible);
  }, []);

  const overlayScreenHeight = useCallback(() => {
    if (typeof window === 'undefined') return 1;
    return Math.max(window.innerHeight || 0, 1);
  }, []);

  const applyDragTransform = useCallback((deltaY: number) => {
    const node = shellRef.current;
    const backdrop = backdropRef.current;
    const screenHeight = overlayScreenHeight();
    const opacity = Math.max(0, 1 - (Math.abs(deltaY) / screenHeight));
    if (node) node.style.transform = `translate3d(0, ${deltaY}px, 0)`;
    if (backdrop) backdrop.style.backgroundColor = `rgba(0,0,0,${opacity})`;
  }, [overlayScreenHeight]);

  const applyHeaderDrag = useCallback(
    (translateY: number) => {
      const motor = headerMotorRef.current;
      const height = motor.height || resolveHeaderHeight();
      const clamped = Math.min(0, Math.max(-height, translateY));
      motor.translate = clamped;
      motor.height = height;
      paintHeader(-clamped, false);
    },
    [paintHeader, resolveHeaderHeight]
  );

  const settleHeaderDrag = useCallback(() => {
    const motor = headerMotorRef.current;
    motor.touchId = -1;
    motor.axisLocked = false;
    if (!motor.active) return;
    motor.active = false;
    const height = motor.height || resolveHeaderHeight();
    const progress = Math.min(1, Math.abs(motor.translate) / height);
    const decisive = Math.abs(motor.velocity) >= HEADER_VELOCITY_PX_MS;
    const hidden = decisive ? motor.velocity < 0 : progress >= 0.5;

    if (headerSettleTimer.current !== null) window.clearTimeout(headerSettleTimer.current);
    paintHeaderCollapsed(hidden, true);
    applyHeaderCollapse(hidden);

    headerSettleTimer.current = window.setTimeout(() => {
      headerSettleTimer.current = null;
      if (headerMotorRef.current.active) return;
      paintHeaderCollapsed(headerCollapsedRef.current, false);
    }, SNAP_MS);
  }, [applyHeaderCollapse, paintHeaderCollapsed, resolveHeaderHeight]);

  useEffect(() => {
    // PRIMEIRO FRAME: mede a geometria real (safe-area + faixa de 44px) e crava
    // a posição absoluta no topo sem animação. A altura medida aqui alimenta o
    // motor de toque, evitando o clamp com um valor desatualizado no 1º gesto.
    const node = headerRef.current;
    if (node) {
      headerMotorRef.current.height = resolveHeaderHeight();
      node.style.transition = 'none';
      node.style.transform = 'translate3d(0, 0, 0)';
      node.style.opacity = headerCollapsedRef.current ? '0' : '1';
      if (headerCollapsedRef.current) paintHeaderCollapsed(true, false);
    }
    const onResize = () => {
      if (headerMotorRef.current.active) return;
      headerMotorRef.current.height = resolveHeaderHeight();
      paintHeaderCollapsed(headerCollapsedRef.current, false);
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, [paintHeaderCollapsed, resolveHeaderHeight]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const motor = headerMotorRef.current;

    // O motor do header só responde ao Ghost UI (UI visível) e nunca durante o
    // swipe-to-dismiss, para não disputar o eixo do portal.
    const canDriveHeader = () => isUIVisibleRef.current && !dragRef.current.dismissing;

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1 || !canDriveHeader()) {
        motor.touchId = -1;
        motor.axisLocked = false;
        return;
      }
      const touch = event.touches[0];
      if (headerSettleTimer.current !== null) {
        window.clearTimeout(headerSettleTimer.current);
        headerSettleTimer.current = null;
      }
      motor.touchId = touch.identifier;
      motor.originX = touch.clientX;
      motor.originY = touch.clientY;
      motor.lastY = touch.clientY;
      motor.lastAt = event.timeStamp;
      motor.velocity = 0;
      motor.height = resolveHeaderHeight();
      motor.translate = headerCollapsedRef.current ? -motor.height : 0;
      motor.baseTranslate = motor.translate;
      motor.active = false;
      motor.axisLocked = false;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (motor.touchId < 0) return;
      const touch = Array.from(event.touches).find((item) => item.identifier === motor.touchId);
      if (!touch) return;
      const deltaY = touch.clientY - motor.originY;
      const deltaX = touch.clientX - motor.originX;

      if (!motor.active) {
        const absY = Math.abs(deltaY);
        const absX = Math.abs(deltaX);
        // Dead zone: espera o gesto sair do ruído antes de assumir o eixo.
        if (absY < HEADER_DRAG_DEAD_ZONE_PX && absX < HEADER_DRAG_DEAD_ZONE_PX) return;
        // Gesto horizontal nunca pertence ao header (deixa o scroller nativo).
        if (absX > absY) {
          motor.touchId = -1;
          motor.axisLocked = false;
          return;
        }
        // Reancora a origem para o header partir exatamente de onde o dedo
        // saiu da dead zone, sem o salto de 10px do primeiro frame.
        motor.originY = touch.clientY;
        motor.axisLocked = true;
        motor.active = true;
        motor.translate = motor.baseTranslate;
        if (headerRef.current) headerRef.current.style.transition = 'none';
        applyHeaderDrag(motor.baseTranslate);
        return;
      }

      const dt = Math.max(1, event.timeStamp - motor.lastAt);
      motor.velocity = (touch.clientY - motor.lastY) / dt;
      motor.lastY = touch.clientY;
      motor.lastAt = event.timeStamp;
      applyHeaderDrag(motor.baseTranslate + (touch.clientY - motor.originY));
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (motor.touchId < 0) return;
      const stillTouching = Array.from(event.touches).some(
        (item) => item.identifier === motor.touchId
      );
      if (stillTouching) return;
      settleHeaderDrag();
    };

    scroller.addEventListener('touchstart', onTouchStart, { passive: true });
    scroller.addEventListener('touchmove', onTouchMove, { passive: true });
    scroller.addEventListener('touchend', onTouchEnd, { passive: true });
    scroller.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      scroller.removeEventListener('touchstart', onTouchStart);
      scroller.removeEventListener('touchmove', onTouchMove);
      scroller.removeEventListener('touchend', onTouchEnd);
      scroller.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [applyHeaderDrag, resolveHeaderHeight, settleHeaderDrag]);

  useEffect(() => {
    return () => {
      if (headerSettleTimer.current !== null) window.clearTimeout(headerSettleTimer.current);
    };
  }, []);

  const lockScroller = useCallback((locked: boolean) => {
    const scroller = scrollerRef.current;
    const shell = shellRef.current;
    const freeze = locked || !isUIVisibleRef.current;
    if (scroller) {
      scroller.style.overflowY = freeze ? 'hidden' : '';
      scroller.style.touchAction = freeze ? 'none' : '';
    }
    if (shell) {
      shell.style.touchAction = freeze ? 'none' : '';
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

  useEffect(() => {
    lockScroller(!isUIVisible);
  }, [isUIVisible, lockScroller]);

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
    if (isUIVisibleRef.current) return;
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
    dragRef.current.dir = 1;
    dragRef.current.active = false;
  }, []);

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (drag.pointerId !== event.pointerId || drag.dismissing) return;
      const scroller = scrollerRef.current;
      const shell = shellRef.current;
      if (!scroller || !shell) return;

      if (isUIVisibleRef.current) return;

      const deltaY = event.clientY - drag.startY;
      const deltaX = event.clientX - drag.startX;

      if (!drag.active) {
        if (Math.abs(deltaY) < DRAG_ACTIVATE_PX) return;
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          drag.pointerId = -1;
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
      const raw = Math.abs(deltaY);
      const offset = raw * RUBBER;
      drag.dir = deltaY < 0 ? -1 : 1;
      drag.raw = raw;
      drag.offset = offset;
      applyDragTransform(offset * drag.dir);
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
        (drag.raw >= DISMISS_DISTANCE_PX || Math.abs(drag.velocity) >= DISMISS_VELOCITY_PX_MS);

      if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);

      if (shouldDismiss) {
        drag.dismissing = true;
        lockScroller(true);
        const viewportH = overlayScreenHeight();
        if (shell) {
          shell.style.transition = DISMISS_EASE;
          if (backdropRef.current) backdropRef.current.style.transition = DISMISS_BACKDROP_EASE;
          applyDragTransform(viewportH * drag.dir);
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
          <header
            ref={headerRef}
            data-immersive-header
            aria-hidden={isHeaderCollapsed}
            className={cn(
              'pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-col items-center',
              'pt-[env(safe-area-inset-top)] transform-gpu will-change-[transform,opacity]'
            )}
          >
            <div className="pointer-events-none flex h-11 w-full shrink-0 items-center justify-center">
              <BrandLogo className="pointer-events-none h-auto w-auto px-0" size="sm" />
            </div>
          </header>
          <div
            ref={scrollerRef}
            onScroll={onScroll}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            className={cn(
              'flex h-[100dvh] w-full flex-col gap-0 space-y-0 p-0 m-0 snap-y snap-mandatory scrollbar-none',
              'overscroll-y-contain [-webkit-overflow-scrolling:touch]',
              'transform-gpu',
              isUIVisible ? 'overflow-y-scroll touch-pan-y' : 'overflow-hidden touch-none',
              className
            )}
            style={{
              scrollSnapType: 'y mandatory',
              scrollBehavior: 'auto',
              overscrollBehaviorY: 'contain',
              WebkitOverflowScrolling: 'touch',
              willChange: 'scroll-position',
            }}
          >
            {feedItems.map((item, index) => {
              const mounted = Math.abs(index - activeIndex) <= WINDOW_RADIUS;
              const handle = item.artistUsername || item.artistName;
              return (
                <div
                  key={item.id}
                  className="h-[100dvh] w-full flex-shrink-0 snap-start snap-always overflow-hidden transform-gpu"
                  style={{ contain: 'layout paint size', scrollSnapStop: 'always' }}
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
                      onUIVisibleChange={index === activeIndex ? handleUIVisibleChange : undefined}
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
