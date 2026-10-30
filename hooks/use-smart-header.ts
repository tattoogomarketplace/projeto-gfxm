'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { usePathname } from 'next/navigation';
import { useUiStore } from '@/hooks/use-ui-store';

const HIDE_AFTER_Y = 50;
const DOWN_DELTA_PX = 6;
const REVEAL_VELOCITY_PX_MS = 0.8;
const MAX_FRAME_MS = 64;
const HIDDEN_CLASS = 'is-header-hidden';
const SHELL_VIEWPORT_SELECTOR = '[data-shell-viewport]';
const MAIN_SCROLL_ID = 'main-scroll-container';

function isVerticallyScrollable(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  const overflowY = style.overflowY;
  return (
    (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
    el.scrollHeight > el.clientHeight + 1
  );
}

function resolveShellViewport(): HTMLElement | null {
  return (
    document.getElementById(MAIN_SCROLL_ID) ??
    document.querySelector<HTMLElement>(SHELL_VIEWPORT_SELECTOR)
  );
}

function resolveActiveScroller(root: HTMLElement | null): HTMLElement | null {
  if (!root) return null;
  if (isVerticallyScrollable(root)) return root;
  const nested = root.querySelectorAll<HTMLElement>('*');
  for (const node of nested) {
    if (!isVerticallyScrollable(node)) continue;
    const hidden = node.closest('[aria-hidden="true"], [inert]');
    if (hidden && hidden !== root) continue;
    return node;
  }
  return root;
}

function readScrollTop(scroller: EventTarget | null): number {
  if (!scroller) return 0;
  if (scroller === window || scroller === document || scroller === document.documentElement) {
    return window.scrollY || document.documentElement.scrollTop || 0;
  }
  if (scroller instanceof HTMLElement) return scroller.scrollTop;
  return 0;
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
  const lastSourceRef = useRef<EventTarget | null>(null);
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

    const viewport = resolveShellViewport();
    if (!viewport) return;

    const initial = resolveActiveScroller(viewport);
    lastSourceRef.current = initial;
    lastYRef.current = readScrollTop(initial);
    lastTimeRef.current = performance.now();
    downAccumRef.current = 0;
    applyHidden(false);

    const onScroll = (event: Event) => {
      const source = event.target;
      if (!(source instanceof HTMLElement)) return;
      if (source !== viewport && !isVerticallyScrollable(source)) return;
      if (tickingRef.current) return;
      tickingRef.current = true;
      frameRef.current = window.requestAnimationFrame(() => {
        tickingRef.current = false;
        const now = performance.now();
        const y = readScrollTop(source);
        if (source !== lastSourceRef.current) {
          lastSourceRef.current = source;
          lastYRef.current = y;
          lastTimeRef.current = now;
          downAccumRef.current = 0;
          if (y <= 0) applyHidden(false);
          return;
        }
        const delta = y - lastYRef.current;
        const dt = Math.max(1, Math.min(now - lastTimeRef.current, MAX_FRAME_MS));
        lastYRef.current = y;
        lastTimeRef.current = now;
        if (delta === 0) return;

        if (y <= 0) {
          downAccumRef.current = 0;
          applyHidden(false);
          return;
        }

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

        downAccumRef.current = 0;
        const velocity = -delta / dt;
        if (velocity >= REVEAL_VELOCITY_PX_MS) applyHidden(false);
      });
    };

    const scrollOpts: AddEventListenerOptions = { passive: true, capture: true };
    viewport.addEventListener('scroll', onScroll, scrollOpts);

    return () => {
      viewport.removeEventListener('scroll', onScroll, scrollOpts);
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
      }
      tickingRef.current = false;
    };
  }, [enabled, pathname, setHeaderHidden]);

  return headerRef;
}
