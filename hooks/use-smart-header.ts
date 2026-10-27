'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { usePathname } from 'next/navigation';
import { useUiStore } from '@/hooks/use-ui-store';

const DELTA_PX = 15;
const HIDE_AFTER_Y = 50;
const HEADER_HIDDEN_TRANSFORM = 'translateY(-100%)';
const CHROME_HIDDEN_TRANSFORM =
  'translateY(calc(-1 * var(--app-header-height)))';
const VISIBLE_TRANSFORM = 'translateY(0)';
const HIDE_TRANSITION = 'transform 300ms ease-in-out, opacity 300ms ease-in-out';

function readScrollTop(): number {
  const scroller = document.querySelector<HTMLElement>('[data-shell-viewport]');
  if (scroller && scroller.scrollHeight > scroller.clientHeight + 1) {
    return scroller.scrollTop;
  }
  return window.scrollY || document.documentElement.scrollTop || 0;
}

function applyHideStyles(el: HTMLElement, hidden: boolean, hiddenTransform: string) {
  el.style.willChange = 'transform';
  el.style.transition = HIDE_TRANSITION;
  el.style.pointerEvents = hidden ? 'none' : 'auto';
  el.style.transform = hidden ? hiddenTransform : VISIBLE_TRANSFORM;
  el.style.opacity = hidden ? '0' : '1';
}

function applyChromeHide(hidden: boolean) {
  document.querySelectorAll<HTMLElement>('[data-header-follow]').forEach((el) => {
    applyHideStyles(el, hidden, CHROME_HIDDEN_TRANSFORM);
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
    if (header) applyHideStyles(header, false, HEADER_HIDDEN_TRANSFORM);
    applyChromeHide(false);
  }, [pathname, setHeaderHidden]);

  useEffect(() => {
    const applyHidden = (nextHidden: boolean) => {
      const header = headerRef.current;
      if (hiddenRef.current === nextHidden) {
        if (header) applyHideStyles(header, nextHidden, HEADER_HIDDEN_TRANSFORM);
        applyChromeHide(nextHidden);
        return;
      }
      hiddenRef.current = nextHidden;
      if (header) applyHideStyles(header, nextHidden, HEADER_HIDDEN_TRANSFORM);
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
