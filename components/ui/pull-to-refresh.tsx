'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { BRAND_WORDMARK } from '@/lib/i18n/brands';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { cn } from '@/lib/utils';

const THRESHOLD_PX = 60;
const MAX_PULL_PX = 112;
const DAMPING = 0.38;
const INDICATOR_SIZE = 44;
const INDICATOR_HIDE_PX = 56;
const REST_PULL_PX = 60;
const MIN_REFRESH_MS = 560;
const MAX_REFRESH_MS = 2400;
const SNAP_MS = 380;
const SNAP_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
const AXIS_LOCK_PX = 8;
const RING_RADIUS = 20;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const RING_DASH = '3.15 4.55';

type Phase = 'idle' | 'pulling' | 'refreshing';

type PullToRefreshProps = {
  children: ReactNode;
  onRefresh?: () => void | Promise<void>;
  className?: string;
  disabled?: boolean;
};

function dampen(raw: number): number {
  if (raw <= 0) return 0;
  return MAX_PULL_PX * (1 - Math.exp((-raw * DAMPING) / 16));
}

function readScrollTop(scroller: HTMLElement | Window | null): number {
  if (!scroller) return 0;
  if (scroller === window) {
    return window.scrollY || document.documentElement.scrollTop || 0;
  }
  return (scroller as HTMLElement).scrollTop;
}

function findActiveScroller(target: EventTarget | null): HTMLElement | Window {
  let current: HTMLElement | null =
    target instanceof HTMLElement
      ? target
      : target instanceof Node
        ? target.parentElement
        : null;

  while (current && current !== document.body && current !== document.documentElement) {
    if (current.hasAttribute('data-shell-viewport')) return current;
    const overflowY = window.getComputedStyle(current).overflowY;
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      current.scrollHeight > current.clientHeight + 1
    ) {
      return current;
    }
    current = current.parentElement;
  }
  return window;
}

export function PullToRefresh({
  children,
  onRefresh,
  className,
  disabled = false,
}: PullToRefreshProps) {
  const router = useRouter();
  const { triggerHaptic } = useHapticFeedback();
  const [isPending, startTransition] = useTransition();
  const [phase, setPhase] = useState<Phase>('idle');

  const rootRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLSpanElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const slotRef = useRef<HTMLElement | null>(null);
  const scrollerRef = useRef<HTMLElement | Window | null>(null);
  const [slotEl, setSlotEl] = useState<HTMLElement | null>(null);

  const phaseRef = useRef<Phase>('idle');
  const pullingRef = useRef(false);
  const trackingRef = useRef(false);
  const armedRef = useRef(false);
  const axisLockedRef = useRef<'x' | 'y' | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const pullRef = useRef(0);
  const rafRef = useRef(0);
  const pendingPullRef = useRef(0);
  const refreshStartedAtRef = useRef(0);
  const sawPendingRef = useRef(false);
  const finishingRef = useRef(false);
  const maxTimerRef = useRef(0);
  const minTimerRef = useRef(0);
  const restTimerRef = useRef(0);

  const setPhaseSafe = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const applyFrame = useCallback((pull: number, withSnap: boolean) => {
    const content = contentRef.current;
    const indicator = indicatorRef.current;
    const mark = markRef.current;
    const ring = ringRef.current;
    const slot = slotRef.current;
    if (!content) return;

    const snapTransform = withSnap ? `transform ${SNAP_MS}ms ${SNAP_EASING}` : 'none';
    const snapHeight = withSnap ? `height ${SNAP_MS}ms ${SNAP_EASING}` : 'none';

    if (slot) {
      slot.style.transition = snapHeight;
      slot.style.height = `${pull}px`;
      content.style.transition = 'none';
      content.style.transform = 'none';
      content.style.willChange = 'auto';
      if (indicator) {
        indicator.style.transition = withSnap ? 'opacity 160ms linear' : 'none';
        indicator.style.transform = 'translate3d(-50%, -50%, 0)';
      }
    } else if (indicator) {
      content.style.transition = snapTransform;
      indicator.style.transition = withSnap
        ? `transform ${SNAP_MS}ms ${SNAP_EASING}, opacity 160ms linear`
        : 'none';
      content.style.transform = pull === 0 ? 'translate3d(0, 0, 0)' : `translate3d(0, ${pull}px, 0)`;
      content.style.willChange = pull === 0 ? 'auto' : 'transform';
      if (pull === 0 && withSnap) {
        if (restTimerRef.current) window.clearTimeout(restTimerRef.current);
        restTimerRef.current = window.setTimeout(() => {
          restTimerRef.current = 0;
          if (pullRef.current !== 0 || !contentRef.current) return;
          contentRef.current.style.transform = 'none';
          contentRef.current.style.transition = 'none';
          contentRef.current.style.willChange = 'auto';
        }, SNAP_MS);
      }
      indicator.style.transform = `translate3d(-50%, ${pull - INDICATOR_HIDE_PX}px, 0)`;
    }

    const progress = Math.min(1, pull / THRESHOLD_PX);
    if (indicator) {
      indicator.style.opacity = String(Math.min(1, pull / 28));
    }
    if (ring) {
      ring.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - progress));
      ring.style.opacity = phaseRef.current === 'refreshing' ? '0' : '1';
    }
    if (mark) {
      mark.style.opacity = String(0.45 + progress * 0.55);
      mark.style.transform = `scale(${0.92 + progress * 0.08})`;
    }
  }, []);

  const schedulePull = useCallback(
    (raw: number) => {
      pendingPullRef.current = dampen(raw);
      if (rafRef.current) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = 0;
        pullRef.current = pendingPullRef.current;
        applyFrame(pullRef.current, false);
      });
    },
    [applyFrame]
  );

  const retract = useCallback(() => {
    finishingRef.current = false;
    pullingRef.current = false;
    armedRef.current = false;
    pullRef.current = 0;
    pendingPullRef.current = 0;
    applyFrame(0, true);
    setPhaseSafe('idle');
  }, [applyFrame, setPhaseSafe]);

  const finishRefresh = useCallback(() => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    if (maxTimerRef.current) {
      window.clearTimeout(maxTimerRef.current);
      maxTimerRef.current = 0;
    }
    if (minTimerRef.current) {
      window.clearTimeout(minTimerRef.current);
      minTimerRef.current = 0;
    }
    const elapsed = performance.now() - refreshStartedAtRef.current;
    const wait = Math.max(0, MIN_REFRESH_MS - elapsed);
    minTimerRef.current = window.setTimeout(() => {
      minTimerRef.current = 0;
      retract();
    }, wait);
  }, [retract]);

  const runRefresh = useCallback(() => {
    setPhaseSafe('refreshing');
    pullingRef.current = false;
    pullRef.current = REST_PULL_PX;
    pendingPullRef.current = REST_PULL_PX;
    applyFrame(REST_PULL_PX, true);
    triggerHaptic('success');
    refreshStartedAtRef.current = performance.now();
    sawPendingRef.current = false;
    finishingRef.current = false;

    maxTimerRef.current = window.setTimeout(() => {
      finishRefresh();
    }, MAX_REFRESH_MS);

    if (onRefresh) {
      Promise.resolve(onRefresh())
        .catch(() => undefined)
        .finally(() => finishRefresh());
      return;
    }

    startTransition(() => {
      router.refresh();
    });
    minTimerRef.current = window.setTimeout(() => {
      minTimerRef.current = 0;
      if (phaseRef.current === 'refreshing' && !sawPendingRef.current) {
        finishRefresh();
      }
    }, MIN_REFRESH_MS);
  }, [applyFrame, finishRefresh, onRefresh, router, setPhaseSafe, startTransition, triggerHaptic]);

  useEffect(() => {
    if (phase !== 'refreshing' || onRefresh) return;
    if (isPending) {
      sawPendingRef.current = true;
      return;
    }
    if (!sawPendingRef.current) return;
    finishRefresh();
  }, [finishRefresh, isPending, onRefresh, phase]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const attachSlot = (node: HTMLElement | null) => {
      slotRef.current = node;
      setSlotEl(node);
    };

    attachSlot(root.querySelector<HTMLElement>('[data-ptr-slot]'));

    const observer = new MutationObserver(() => {
      const next = root.querySelector<HTMLElement>('[data-ptr-slot]');
      if (next === slotRef.current) return;
      attachSlot(next);
    });
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    applyFrame(pullRef.current, false);
  }, [applyFrame, slotEl]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || disabled) return;

    const onStart = (event: TouchEvent) => {
      if (phaseRef.current === 'refreshing') return;
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      if (!touch) return;

      scrollerRef.current = findActiveScroller(event.target);
      const atWindowTop = window.scrollY === 0;
      const atScrollerTop = readScrollTop(scrollerRef.current) <= 0;
      if (!atWindowTop || !atScrollerTop) {
        trackingRef.current = false;
        pullingRef.current = false;
        axisLockedRef.current = null;
        return;
      }

      trackingRef.current = true;
      startXRef.current = touch.clientX;
      startYRef.current = touch.clientY;
      pullingRef.current = false;
      armedRef.current = false;
      axisLockedRef.current = null;
    };

    const onMove = (event: TouchEvent) => {
      if (phaseRef.current === 'refreshing') return;
      if (!trackingRef.current) return;
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      if (!touch) return;

      const dx = touch.clientX - startXRef.current;
      const dy = touch.clientY - startYRef.current;

      if (!pullingRef.current) {
        if (axisLockedRef.current === 'x') return;
        if (Math.abs(dx) > AXIS_LOCK_PX && Math.abs(dx) > Math.abs(dy) * 1.15) {
          axisLockedRef.current = 'x';
          return;
        }
        if (window.scrollY !== 0 || readScrollTop(scrollerRef.current) > 0) return;
        if (dy <= AXIS_LOCK_PX) return;
        axisLockedRef.current = 'y';
        pullingRef.current = true;
        setPhaseSafe('pulling');
        triggerHaptic('light');
      }

      if (event.cancelable) event.preventDefault();
      schedulePull(dy);

      const next = dampen(dy);
      if (!armedRef.current && next >= THRESHOLD_PX) {
        armedRef.current = true;
        triggerHaptic('medium');
      } else if (armedRef.current && next < THRESHOLD_PX * 0.82) {
        armedRef.current = false;
      }
    };

    const onEnd = () => {
      trackingRef.current = false;
      if (phaseRef.current === 'refreshing') return;
      if (!pullingRef.current) {
        axisLockedRef.current = null;
        return;
      }
      pullingRef.current = false;
      axisLockedRef.current = null;
      const pull = pullRef.current;
      if (pull >= THRESHOLD_PX) {
        runRefresh();
        return;
      }
      retract();
    };

    root.addEventListener('touchstart', onStart, { passive: true });
    root.addEventListener('touchmove', onMove, { passive: false });
    root.addEventListener('touchend', onEnd, { passive: true });
    root.addEventListener('touchcancel', onEnd, { passive: true });

    return () => {
      root.removeEventListener('touchstart', onStart);
      root.removeEventListener('touchmove', onMove);
      root.removeEventListener('touchend', onEnd);
      root.removeEventListener('touchcancel', onEnd);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      if (maxTimerRef.current) window.clearTimeout(maxTimerRef.current);
      if (minTimerRef.current) window.clearTimeout(minTimerRef.current);
      if (restTimerRef.current) window.clearTimeout(restTimerRef.current);
    };
  }, [disabled, retract, runRefresh, schedulePull, setPhaseSafe, triggerHaptic]);

  const refreshing = phase === 'refreshing';
  const slotted = Boolean(slotEl);
  const indicatorStyle: CSSProperties = slotted
    ? {
        width: INDICATOR_SIZE,
        height: INDICATOR_SIZE,
        transform: 'translate3d(-50%, -50%, 0)',
        opacity: 0,
        willChange: 'opacity',
      }
    : {
        width: INDICATOR_SIZE,
        height: INDICATOR_SIZE,
        transform: `translate3d(-50%, ${-INDICATOR_HIDE_PX}px, 0)`,
        opacity: 0,
        willChange: 'transform, opacity',
      };

  const badge = (
    <div
      ref={indicatorRef}
      className={cn(
        'pointer-events-none z-[35] flex items-center justify-center transform-gpu',
        slotted ? 'absolute left-1/2 top-1/2' : 'absolute left-1/2 top-0'
      )}
      style={indicatorStyle}
      aria-hidden={phase === 'idle'}
      aria-live="polite"
      role="status"
    >
      <div
        className={cn(
          'relative flex h-11 w-11 min-h-11 min-w-11 items-center justify-center overflow-visible rounded-full',
          'border border-white/10 bg-[#121212] shadow-[0_8px_24px_rgba(0,0,0,0.45)]',
          refreshing && 'drop-shadow-[0_0_12px_rgba(144,238,144,0.28)]'
        )}
      >
        <svg
          className={cn(
            'pointer-events-none absolute inset-0 h-full w-full',
            phase !== 'idle' && 'ptr-ring-spin'
          )}
          viewBox="0 0 44 44"
          aria-hidden
        >
          <circle
            cx="22"
            cy="22"
            r={RING_RADIUS}
            fill="none"
            stroke="#90EE90"
            strokeWidth="1.45"
            strokeDasharray={RING_DASH}
            strokeLinecap="round"
            opacity="0.88"
          />
          <circle
            ref={ringRef}
            cx="22"
            cy="22"
            r={RING_RADIUS}
            fill="none"
            stroke="#90EE90"
            strokeWidth="1.55"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={RING_CIRCUMFERENCE}
          />
        </svg>
        <span
          className="pointer-events-none absolute inset-[6px] overflow-hidden rounded-full bg-[#161616] shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]"
          aria-hidden
        >
          <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/15 via-transparent to-black/35" />
          <svg
            className={cn(
              'pointer-events-none absolute inset-x-0 bottom-0 h-[58%] w-full text-[#90EE90]',
              refreshing && 'ptr-wave-shift'
            )}
            viewBox="0 0 34 20"
            preserveAspectRatio="none"
          >
            <path
              d="M0 9 C 5.5 5.2, 11 12.8, 17 9 C 23 5.2, 28.5 12.8, 34 9 L 34 20 L 0 20 Z"
              fill="currentColor"
              opacity="0.92"
            />
            <path
              d="M0 12 C 6 9.4, 11.5 14.6, 17 12 C 22.5 9.4, 28 14.6, 34 12 L 34 20 L 0 20 Z"
              fill="#7FE07F"
              opacity="0.55"
            />
          </svg>
        </span>
        <span
          ref={markRef}
          className="relative z-[1] select-none text-[11px] font-black tracking-tight text-[#FF5F1F] drop-shadow-[0_0_8px_rgba(255,95,31,0.45)] transform-gpu"
        >
          {BRAND_WORDMARK.mark}
        </span>
      </div>
    </div>
  );

  return (
    <div
      ref={rootRef}
      className={cn('relative flex min-h-0 min-w-0 w-full flex-1 flex-col', className)}
      data-ptr-root
    >
      {slotted && slotEl ? createPortal(badge, slotEl) : badge}
      <div
        ref={contentRef}
        className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col"
      >
        {children}
      </div>
    </div>
  );
}
