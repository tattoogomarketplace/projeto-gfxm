'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { usePathname } from 'next/navigation';
import { useUiStore } from '@/hooks/use-ui-store';

const DELTA_PX = 6;
const TOP_REVEAL_PX = 8;
const HIDDEN_TRANSFORM = 'translateY(-100%)';
const VISIBLE_TRANSFORM = 'translateY(0)';

function readScrollTop(): number {
  const scroller = document.querySelector<HTMLElement>('[data-shell-viewport]');
  if (scroller && scroller.scrollHeight > scroller.clientHeight + 1) {
    return scroller.scrollTop;
  }
  return window.scrollY || document.documentElement.scrollTop || 0;
}

function applyChromeTransform(hidden: boolean) {
  const transform = hidden ? HIDDEN_TRANSFORM : VISIBLE_TRANSFORM;
  document.querySelectorAll<HTMLElement>('[data-header-follow]').forEach((el) => {
    el.style.transform = transform;
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
    if (header) header.style.transform = VISIBLE_TRANSFORM;
    applyChromeTransform(false);
  }, [pathname, setHeaderHidden]);

  useEffect(() => {
    const applyHidden = (nextHidden: boolean) => {
      const header = headerRef.current;
      if (hiddenRef.current === nextHidden) {
        if (header && !header.style.transform) {
          header.style.transform = nextHidden ? HIDDEN_TRANSFORM : VISIBLE_TRANSFORM;
        }
        return;
      }
      hiddenRef.current = nextHidden;
      if (header) {
        header.style.willChange = 'transform';
        header.style.transform = nextHidden ? HIDDEN_TRANSFORM : VISIBLE_TRANSFORM;
      }
      applyChromeTransform(nextHidden);
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
