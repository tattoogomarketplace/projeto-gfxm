'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { useUiStore } from '@/hooks/use-ui-store';

export function useSmartHeader(enabled: boolean): RefObject<HTMLElement | null> {
  void enabled;
  const setHeaderHidden = useUiStore((s) => s.setHeaderHidden);
  const headerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setHeaderHidden(false);
    const header = headerRef.current;
    if (header) {
      header.style.transform = '';
      header.style.opacity = '';
      header.style.pointerEvents = '';
      header.style.willChange = '';
      header.style.transition = '';
    }
    document.querySelectorAll<HTMLElement>('[data-header-follow]').forEach((el) => {
      el.style.transform = '';
      el.style.opacity = '';
      el.style.pointerEvents = '';
      el.style.willChange = '';
      el.style.transition = '';
    });
  }, [setHeaderHidden]);

  return headerRef;
}
