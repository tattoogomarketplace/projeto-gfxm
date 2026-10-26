'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useUiStore } from '@/hooks/use-ui-store';

const DELTA_PX = 6;
const TOP_REVEAL_PX = 8;

function readScrollTop(): number {
  const scroller = document.querySelector<HTMLElement>('[data-shell-viewport]');
  if (scroller && scroller.scrollHeight > scroller.clientHeight + 1) {
    return scroller.scrollTop;
  }
  return window.scrollY || document.documentElement.scrollTop || 0;
}

export function useSmartHeader(enabled: boolean): boolean {
  const pathname = usePathname();
  const hidden = useUiStore((s) => s.headerHidden);
  const setHeaderHidden = useUiStore((s) => s.setHeaderHidden);
  const lastYRef = useRef(0);
  const tickingRef = useRef(false);

  useEffect(() => {
    setHeaderHidden(false);
  }, [pathname, setHeaderHidden]);

  useEffect(() => {
    if (!enabled) {
      setHeaderHidden(false);
      return;
    }

    lastYRef.current = readScrollTop();

    const onScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;
      window.requestAnimationFrame(() => {
        tickingRef.current = false;
        const y = readScrollTop();
        const delta = y - lastYRef.current;
        lastYRef.current = y;
        if (y <= TOP_REVEAL_PX) {
          setHeaderHidden(false);
          return;
        }
        if (delta > DELTA_PX) setHeaderHidden(true);
        else if (delta < -DELTA_PX) setHeaderHidden(false);
      });
    };

    const scroller = document.querySelector('[data-shell-viewport]');
    scroller?.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      scroller?.removeEventListener('scroll', onScroll);
      window.removeEventListener('scroll', onScroll);
    };
  }, [enabled, setHeaderHidden]);

  return enabled ? hidden : false;
}
