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
import { usePathname, useRouter } from 'next/navigation';
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
const FINISHING_MS = 800;
const MAX_REFRESH_MS = 2400;
const SNAP_MS = 380;
const SNAP_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
const SUCCESS_GREEN = '#22c55e';
const AXIS_LOCK_PX = 8;
const RING_RADIUS = 20;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const RING_DASH = '3.15 4.55';
const ACCENT_MINT = { r: 144, g: 238, b: 144 };
const ACCENT_ORANGE = { r: 255, g: 95, b: 31 };
const ACCENT_MINT_CSS = '#90EE90';

function clamp01(value: number): number {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function lerpChannel(from: number, to: number, t: number): number {
  return Math.round(from + (to - from) * t);
}

function accentCss(t: number): string {
  const k = clamp01(t);
  return `rgb(${lerpChannel(ACCENT_MINT.r, ACCENT_ORANGE.r, k)} ${lerpChannel(ACCENT_MINT.g, ACCENT_ORANGE.g, k)} ${lerpChannel(ACCENT_MINT.b, ACCENT_ORANGE.b, k)})`;
}

type Phase = 'idle' | 'pulling' | 'refreshing' | 'finishing';

type PullToRefreshProps = {
  children: ReactNode;
  onRefresh?: () => void | Promise<void>;
  className?: string;
  disabled?: boolean;
  topOffsetClass?: string;
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
  topOffsetClass,
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
  const waveRef = useRef<HTMLSpanElement>(null);
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
  const finishingTimerRef = useRef(0);
  const colorRafRef = useRef(0);

  const setPhaseSafe = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const applyFrame = useCallback((pull: number, withSnap: boolean) => {
    const content = contentRef.current;
    const indicator = indicatorRef.current;
    const mark = markRef.current;
    const ring = ringRef.current;
    if (!content) return;

    const finishingNow = phaseRef.current === 'finishing';
    const snapTransform = withSnap ? `transform ${SNAP_MS}ms ${SNAP_EASING}` : 'none';

    content.style.transition = snapTransform;
    content.style.willChange = 'transform, opacity';
    content.style.transform = `translate3d(0, ${pull}px, 0)`;
    if (pull === 0 && withSnap) {
      if (restTimerRef.current) window.clearTimeout(restTimerRef.current);
      restTimerRef.current = window.setTimeout(() => {
        restTimerRef.current = 0;
        if (pullRef.current !== 0 || !contentRef.current) return;
        contentRef.current.style.transform = 'translate3d(0, 0, 0)';
        contentRef.current.style.transition = 'none';
        contentRef.current.style.willChange = 'transform, opacity';
      }, SNAP_MS);
    }

    if (indicator) {
      indicator.style.transition = withSnap
        ? `transform ${SNAP_MS}ms ${SNAP_EASING}, opacity 160ms linear`
        : 'none';
      indicator.style.willChange = 'transform, opacity';
      indicator.style.transform = `translate3d(-50%, ${Math.max(0, pull - INDICATOR_HIDE_PX)}px, 0)`;
    }

    const pullProgress = clamp01(pull / THRESHOLD_PX);
    const refreshingNow = phaseRef.current === 'refreshing' && !finishingNow;
    const loadProgress = refreshingNow
      ? clamp01((performance.now() - refreshStartedAtRef.current) / MIN_REFRESH_MS)
      : 0;
    const progress = finishingNow
      ? 1
      : refreshingNow
        ? Math.max(pullProgress, loadProgress)
        : pullProgress;
    const accent = finishingNow ? SUCCESS_GREEN : accentCss(progress);
    const wave = waveRef.current;

    if (indicator) {
      indicator.style.opacity = String(Math.min(1, pull / 28));
      indicator.style.setProperty('--ptr-progress', progress.toFixed(4));
      indicator.style.setProperty('--ptr-accent', accent);
      indicator.style.color = accent;
    }
    if (ring) {
      ring.style.stroke = accent;
      if (finishingNow) {
        ring.style.opacity = '1';
        if (ring.dataset.emptying !== '1') {
          ring.dataset.emptying = '1';
          ring.style.transition = 'none';
          ring.style.strokeDashoffset = '0';
          window.requestAnimationFrame(() => {
            if (phaseRef.current !== 'finishing' || !ringRef.current) return;
            ringRef.current.style.transition = `stroke-dashoffset ${FINISHING_MS}ms ${SNAP_EASING}, stroke 160ms linear`;
            ringRef.current.style.strokeDashoffset = String(RING_CIRCUMFERENCE);
          });
        }
      } else {
        ring.dataset.emptying = '0';
        ring.style.transition = 'none';
        ring.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - progress));
        ring.style.opacity = phaseRef.current === 'refreshing' ? '0' : '1';
      }
    }
    if (wave) {
      wave.style.transform = `translate3d(0, ${(1 - progress) * 46}%, 0)`;
    }
    if (mark) {
      mark.style.opacity = String(0.55 + progress * 0.45);
      mark.style.transform = 'translate3d(0, 0, 0)';
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

  const stopColorTicker = useCallback(() => {
    if (!colorRafRef.current) return;
    window.cancelAnimationFrame(colorRafRef.current);
    colorRafRef.current = 0;
  }, []);

  const startColorTicker = useCallback(() => {
    stopColorTicker();
    const tick = () => {
      if (phaseRef.current !== 'refreshing') {
        colorRafRef.current = 0;
        return;
      }
      applyFrame(pullRef.current, false);
      colorRafRef.current = window.requestAnimationFrame(tick);
    };
    colorRafRef.current = window.requestAnimationFrame(tick);
  }, [applyFrame, stopColorTicker]);

  const retract = useCallback(() => {
    stopColorTicker();
    finishingRef.current = false;
    pullingRef.current = false;
    armedRef.current = false;
    pullRef.current = 0;
    pendingPullRef.current = 0;
    if (finishingTimerRef.current) {
      window.clearTimeout(finishingTimerRef.current);
      finishingTimerRef.current = 0;
    }
    setPhaseSafe('idle');
    applyFrame(0, true);
  }, [applyFrame, setPhaseSafe, stopColorTicker]);

  const finishRefresh = useCallback(() => {
    if (finishingRef.current) return;
    if (phaseRef.current !== 'refreshing') return;
    finishingRef.current = true;
    stopColorTicker();
    if (maxTimerRef.current) {
      window.clearTimeout(maxTimerRef.current);
      maxTimerRef.current = 0;
    }
    if (minTimerRef.current) {
      window.clearTimeout(minTimerRef.current);
      minTimerRef.current = 0;
    }
    if (finishingTimerRef.current) {
      window.clearTimeout(finishingTimerRef.current);
      finishingTimerRef.current = 0;
    }
    const elapsed = performance.now() - refreshStartedAtRef.current;
    const wait = Math.max(0, MIN_REFRESH_MS - elapsed);
    minTimerRef.current = window.setTimeout(() => {
      minTimerRef.current = 0;
      if (phaseRef.current !== 'refreshing') return;
      pullRef.current = REST_PULL_PX;
      pendingPullRef.current = REST_PULL_PX;
      setPhaseSafe('finishing');
      applyFrame(REST_PULL_PX, false);
      finishingTimerRef.current = window.setTimeout(() => {
        finishingTimerRef.current = 0;
        retract();
      }, FINISHING_MS);
    }, wait);
  }, [applyFrame, retract, setPhaseSafe, stopColorTicker]);

  const runRefresh = useCallback(() => {
    setPhaseSafe('refreshing');
    pullingRef.current = false;
    pullRef.current = REST_PULL_PX;
    pendingPullRef.current = REST_PULL_PX;
    sawPendingRef.current = false;
    finishingRef.current = false;
    refreshStartedAtRef.current = performance.now();
    applyFrame(REST_PULL_PX, true);
    startColorTicker();
    triggerHaptic('success');

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
  }, [applyFrame, finishRefresh, onRefresh, router, setPhaseSafe, startColorTicker, startTransition, triggerHaptic]);

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
    applyFrame(pullRef.current, false);
  }, [applyFrame]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || disabled) return;

    const onStart = (event: TouchEvent) => {
      if (phaseRef.current === 'refreshing' || phaseRef.current === 'finishing') return;
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
      if (phaseRef.current === 'refreshing' || phaseRef.current === 'finishing') return;
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
      if (phaseRef.current === 'refreshing' || phaseRef.current === 'finishing') return;
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
      if (colorRafRef.current) window.cancelAnimationFrame(colorRafRef.current);
      if (maxTimerRef.current) window.clearTimeout(maxTimerRef.current);
      if (minTimerRef.current) window.clearTimeout(minTimerRef.current);
      if (finishingTimerRef.current) window.clearTimeout(finishingTimerRef.current);
      if (restTimerRef.current) window.clearTimeout(restTimerRef.current);
    };
  }, [disabled, retract, runRefresh, schedulePull, setPhaseSafe, triggerHaptic]);

  const refreshing = phase === 'refreshing';
  const active = refreshing || phase === 'finishing';
  const indicatorStyle: CSSProperties = {
    width: INDICATOR_SIZE,
    height: INDICATOR_SIZE,
    transform: 'translate3d(-50%, 0, 0)',
    opacity: 0,
    willChange: 'transform, opacity',
    color: ACCENT_MINT_CSS,
    ['--ptr-progress' as string]: '0',
    ['--ptr-accent' as string]: ACCENT_MINT_CSS,
  };

  const badge = disabled ? null : (
      <div
        ref={indicatorRef}
        className={cn(
          'pointer-events-none absolute left-[50%] z-[30] flex items-center justify-center translate-x-[-50%] transform-gpu',
          topOffsetClass ?? 'top-[var(--app-header-height)]'
        )}
        data-ptr-indicator
      style={indicatorStyle}
      aria-hidden={phase === 'idle'}
      aria-live="polite"
      role="status"
    >
      <div
        className={cn(
          'ptr-badge relative flex h-11 w-11 min-h-11 min-w-11 items-center justify-center overflow-visible rounded-full',
          'border border-white/10 bg-[#121212] shadow-[0_8px_24px_rgba(0,0,0,0.45)]',
          'transform-gpu',
          active && 'drop-shadow-[0_0_12px_var(--ptr-accent)]'
        )}
      >
        <svg
          className={cn(
            'pointer-events-none absolute inset-0 h-full w-full transform-gpu',
            (phase === 'pulling' || refreshing) && 'ptr-ring-spin'
          )}
          viewBox="0 0 44 44"
          aria-hidden
        >
          <circle
            className="ptr-accent-stroke"
            cx="22"
            cy="22"
            r={RING_RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.45"
            strokeDasharray={RING_DASH}
            strokeLinecap="round"
            opacity="0.88"
          />
          <circle
            ref={ringRef}
            className="ptr-accent-stroke"
            cx="22"
            cy="22"
            r={RING_RADIUS}
            fill="none"
            stroke="currentColor"
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
          <span className="pointer-events-none absolute inset-0 z-[1] rounded-full bg-gradient-to-b from-white/18 via-transparent to-black/30" />
          <span
            ref={waveRef}
            className="ptr-wave-lift pointer-events-none absolute inset-x-[-20%] bottom-0 h-[118%] w-[140%] transform-gpu"
          >
            <svg
              className={cn(
                'pointer-events-none absolute inset-0 h-full w-full text-current',
                refreshing && 'ptr-wave-shift'
              )}
              viewBox="0 0 48 32"
              preserveAspectRatio="none"
            >
              <path
                className="ptr-accent-fill"
                d="M0 10 C 8 4, 16 16, 24 10 C 32 4, 40 16, 48 10 L 48 32 L 0 32 Z"
                fill="currentColor"
                opacity="0.92"
              />
              <path
                className="ptr-accent-fill"
                d="M0 14 C 9 9, 17 18, 24 14 C 31 10, 39 18, 48 14 L 48 32 L 0 32 Z"
                fill="currentColor"
                opacity="0.52"
              />
            </svg>
          </span>
        </span>
        <span
          ref={markRef}
          className="relative z-[2] flex h-full w-full items-center justify-center select-none text-[11px] font-black leading-none tracking-tight text-[#FF5F1F] drop-shadow-[0_0_8px_rgba(255,95,31,0.45)] transform-gpu"
        >
          {BRAND_WORDMARK.mark}
        </span>
      </div>
    </div>
  );

  return (
    <div
      ref={rootRef}
      className={cn(
        'relative flex min-h-0 min-w-0 w-full flex-1 flex-col transform-gpu',
        className
      )}
      style={{ willChange: 'transform, opacity' }}
      data-ptr-root
    >
      {badge}
      <div
        ref={contentRef}
        className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col transform-gpu"
        style={{ willChange: 'transform, opacity', transform: 'translate3d(0, 0, 0)' }}
      >
        {children}
      </div>
    </div>
  );
}

function isGaleriaPath(pathname: string | null): boolean {
  return Boolean(pathname?.startsWith('/dashboard/galeria'));
}

export function PullToRefreshHost({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  return (
    <PullToRefresh className={className} disabled={isGaleriaPath(pathname)}>
      {children}
    </PullToRefresh>
  );
}
