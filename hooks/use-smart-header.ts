'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { usePathname } from 'next/navigation';
import { useUiStore } from '@/hooks/use-ui-store';

const DELTA_PX = 6;
const TOP_REVEAL_PX = 20;
const HIDDEN_TRANSFORM = 'translateY(-100%)';
const VISIBLE_TRANSFORM = 'translateY(0)';
const HIDE_TRANSITION =
  'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease-in-out';

function readScrollTop(): number {
  const scroller = document.querySelector<HTMLElement>('[data-shell-viewport]');
  if (scroller && scroller.scrollHeight > scroller.clientHeight + 1) {
    return scroller.scrollTop;
  }
  return window.scrollY || document.documentElement.scrollTop || 0;
}

function applyHideStyles(el: HTMLElement, hidden: boolean) {
  el.style.willChange = 'transform, opacity';
  el.style.transition = HIDE_TRANSITION;
  if (hidden) {
    el.style.transform = HIDDEN_TRANSFORM;
    el.style.opacity = '0';
    el.style.visibility = 'hidden';
    el.style.pointerEvents = 'none';
    return;
  }
  el.style.visibility = 'visible';
  el.style.transform = VISIBLE_TRANSFORM;
  el.style.opacity = '1';
  el.style.pointerEvents = '';
}

function applyChromeHide(hidden: boolean) {
  document.querySelectorAll<HTMLElement>('[data-header-follow]').forEach((el) => {
    applyHideStyles(el, hidden);
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
    const header = headerRef.current;
    if (header) applyHideStyles(header, false);
    applyChromeHide(false);
  }, [pathname, setHeaderHidden]);

  useEffect(() => {
    const applyHidden = (nextHidden: boolean) => {
      const header = headerRef.current;
      if (hiddenRef.current === nextHidden) {
        if (header) applyHideStyles(header, nextHidden);
        applyChromeHide(nextHidden);
        return;
      }
      hiddenRef.current = nextHidden;
      if (header) applyHideStyles(header, nextHidden);
      applyChromeHide(nextHidden);
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
        const y = readScrollTop();
        const delta = y - lastYRef.current;
        lastYRef.current = y;
        if (y <= TOP_REVEAL_PX) {
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
