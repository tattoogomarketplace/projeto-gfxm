'use client';

import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';

export const LONG_PRESS_MS = 420;
export const LONG_PRESS_MOVE_TOLERANCE = 10;
export const CLICK_SUPPRESSION_MS = 800;

export function useLongPressPreview() {
  const pressTimer = useRef<number | null>(null);
  const pressOrigin = useRef<{ x: number; y: number } | null>(null);
  const suppressClickUntil = useRef(0);

  const cancel = useCallback(() => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    pressOrigin.current = null;
  }, []);

  useEffect(() => cancel, [cancel]);

  const start = useCallback(
    (onFire: () => void) => (event: ReactPointerEvent<HTMLElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      cancel();
      pressOrigin.current = { x: event.clientX, y: event.clientY };
      pressTimer.current = window.setTimeout(() => {
        pressTimer.current = null;
        pressOrigin.current = null;
        suppressClickUntil.current = Date.now() + CLICK_SUPPRESSION_MS;
        onFire();
      }, LONG_PRESS_MS);
    },
    [cancel]
  );

  const move = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const origin = pressOrigin.current;
      if (!origin) return;
      if (
        Math.hypot(event.clientX - origin.x, event.clientY - origin.y) >
        LONG_PRESS_MOVE_TOLERANCE
      ) {
        cancel();
      }
    },
    [cancel]
  );

  const consumeClick = useCallback((event?: { preventDefault: () => void; stopPropagation: () => void }) => {
    if (Date.now() < suppressClickUntil.current) {
      suppressClickUntil.current = 0;
      event?.preventDefault();
      event?.stopPropagation();
      return true;
    }
    return false;
  }, []);

  return { start, move, cancel, consumeClick };
}
