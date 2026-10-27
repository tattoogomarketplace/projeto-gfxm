'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { usePathname } from 'next/navigation';
import { useUiStore } from '@/hooks/use-ui-store';

const DELTA_PX = 15;
const HIDE_AFTER_Y = 50;
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
  const tickingRef = useRef(false);
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
    applyHidden(false);

    const onScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;
      window.requestAnimationFrame(() => {
        tickingRef.current = false;
        const y = window.scrollY || readScrollTop();
        const delta = y - lastYRef.current;
        lastYRef.current = y;
        if (y <= HIDE_AFTER_Y) {
          applyHidden(false);
          return;
        }
        if (delta > DELTA_PX) applyHidden(true);
        else if (delta < -DELTA_PX) applyHidden(false);
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    const scroller = document.querySelector('[data-shell-viewport]');
    scroller?.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      scroller?.removeEventListener('scroll', onScroll);
    };
  }, [enabled, setHeaderHidden]);

  return headerRef;
}
