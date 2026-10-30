'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { usePathname } from 'next/navigation';
import { useUiStore } from '@/hooks/use-ui-store';

const HIDE_AFTER_Y = 50;
const DOWN_DELTA_PX = 6;
const REVEAL_VELOCITY_PX_MS = 0.8;
const MAX_FRAME_MS = 64;
const HIDDEN_CLASS = 'is-header-hidden';

function readScrollTop(): number {
  const scroller = document.querySelector<HTMLElement>('[data-shell-viewport]');
  if (scroller && scroller.scrollHeight > scroller.clientHeight + 1) {
    return scroller.scrollTop;
  }
  return window.scrollY || document.documentElement.scrollTop || 0;
}

function applyHiddenClass(el: HTMLElement | null, hidden: boolean) {
  if (!el) return;
  el.classList.toggle(HIDDEN_CLASS, hidden);
}

function applyChromeHidden(hidden: boolean) {
  document.querySelectorAll<HTMLElement>('[data-header-follow]').forEach((el) => {
    applyHiddenClass(el, hidden);
  });
}

export function useSmartHeader(enabled: boolean): RefObject<HTMLElement | null> {
  const pathname = usePathname();
  const setHeaderHidden = useUiStore((s) => s.setHeaderHidden);
  const headerRef = useRef<HTMLElement | null>(null);
  const lastYRef = useRef(0);
  const lastTimeRef = useRef(0);
  const downAccumRef = useRef(0);
  const tickingRef = useRef(false);
  const frameRef = useRef(0);
  const hiddenRef = useRef(false);

  useEffect(() => {
    hiddenRef.current = false;
    setHeaderHidden(false);
    applyHiddenClass(headerRef.current, false);
    applyChromeHidden(false);
  }, [pathname, setHeaderHidden]);

  useEffect(() => {
    const applyHidden = (nextHidden: boolean) => {
      applyHiddenClass(headerRef.current, nextHidden);
      applyChromeHidden(nextHidden);
      if (hiddenRef.current === nextHidden) return;
      hiddenRef.current = nextHidden;
      if (useUiStore.getState().headerHidden !== nextHidden) {
        setHeaderHidden(nextHidden);
      }
    };

    if (!enabled) {
      applyHidden(false);
      return;
    }

    lastYRef.current = readScrollTop();
    lastTimeRef.current = performance.now();
    downAccumRef.current = 0;
    applyHidden(false);

    const onScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;
      frameRef.current = window.requestAnimationFrame(() => {
        tickingRef.current = false;
        const now = performance.now();
        const y = readScrollTop();
        const delta = y - lastYRef.current;
        const dt = Math.max(1, Math.min(now - lastTimeRef.current, MAX_FRAME_MS));
        lastYRef.current = y;
        lastTimeRef.current = now;

        if (y <= HIDE_AFTER_Y) {
          downAccumRef.current = 0;
          applyHidden(false);
          return;
        }

        if (delta > 0) {
          downAccumRef.current += delta;
          if (downAccumRef.current >= DOWN_DELTA_PX) applyHidden(true);
          return;
        }

        if (delta < 0) {
          downAccumRef.current = 0;
          const velocity = -delta / dt;
          if (velocity >= REVEAL_VELOCITY_PX_MS) applyHidden(false);
        }
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    const scroller = document.querySelector('[data-shell-viewport]');
    scroller?.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      scroller?.removeEventListener('scroll', onScroll);
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
      }
      tickingRef.current = false;
    };
  }, [enabled, setHeaderHidden]);

  return headerRef;
}
