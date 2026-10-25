'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { useRouter } from 'next/navigation';
import { BRAND_WORDMARK } from '@/lib/i18n/brands';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { cn } from '@/lib/utils';

const THRESHOLD_PX = 60;
const MAX_PULL_PX = 112;
const DAMPING = 0.38;
const INDICATOR_SIZE = 44;
const INDICATOR_HIDE_PX = 56;
const REST_PULL_PX = 68;
const MIN_REFRESH_MS = 560;
const MAX_REFRESH_MS = 2400;
const SNAP_MS = 380;
const SNAP_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
const AXIS_LOCK_PX = 8;
const RING_RADIUS = 18;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

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
  const scrollerRef = useRef<HTMLElement | Window | null>(null);

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
    if (!content || !indicator) return;

    const transition = withSnap ? `transform ${SNAP_MS}ms ${SNAP_EASING}` : 'none';
    content.style.transition = transition;
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
    const indicatorY = pull - INDICATOR_HIDE_PX;
    indicator.style.transform = `translate3d(-50%, ${indicatorY}px, 0)`;

    const progress = Math.min(1, pull / THRESHOLD_PX);
    indicator.style.opacity = String(Math.min(1, pull / 28));
    if (ring) {
      ring.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - progress));
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
  const indicatorStyle: CSSProperties = {
    width: INDICATOR_SIZE,
    height: INDICATOR_SIZE,
    transform: `translate3d(-50%, ${-INDICATOR_HIDE_PX}px, 0)`,
    opacity: 0,
    willChange: 'transform, opacity',
  };

  return (
    <div
      ref={rootRef}
      className={cn('relative flex min-h-0 min-w-0 w-full flex-1 flex-col', className)}
      data-ptr-root
    >
      <div
        ref={indicatorRef}
        className="pointer-events-none absolute left-1/2 top-0 z-[35] flex items-center justify-center transform-gpu"
        style={indicatorStyle}
        aria-hidden={phase === 'idle'}
        aria-live="polite"
        role="status"
      >
        <div
          className={cn(
            'relative flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-full',
            'border border-white/10 bg-[#121212]/80 shadow-2xl backdrop-blur-xl',
            refreshing && 'animate-pulse drop-shadow-[0_0_15px_#FF5F1F]'
          )}
        >
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full -rotate-90"
            viewBox="0 0 44 44"
            aria-hidden
          >
            <circle
              cx="22"
              cy="22"
              r={RING_RADIUS}
              fill="none"
              stroke="rgba(255,95,31,0.18)"
              strokeWidth="1.5"
            />
            <circle
              ref={ringRef}
              cx="22"
              cy="22"
              r={RING_RADIUS}
              fill="none"
              stroke="#FF5F1F"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={RING_CIRCUMFERENCE}
            />
          </svg>
          <span
            ref={markRef}
            className="relative z-[1] select-none text-[11px] font-black tracking-tight text-[#FF5F1F] transform-gpu"
          >
            {BRAND_WORDMARK.mark}
          </span>
        </div>
      </div>
      <div
        ref={contentRef}
        className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col"
      >
        {children}
      </div>
    </div>
  );
}
