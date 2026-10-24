'use client';

import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';

export const HAPTIC_LONG_PRESS_DELAY_MS = 400;
export const HAPTIC_LONG_PRESS_MOVE_TOLERANCE_PX = 10;

function pulseHaptic() {
  if (typeof window !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
}

type UseHapticLongPressOptions = {
  delay?: number;
  moveTolerance?: number;
};

export function useHapticLongPress(
  onTrigger: () => void,
  options?: UseHapticLongPressOptions
) {
  const delay = options?.delay ?? HAPTIC_LONG_PRESS_DELAY_MS;
  const moveTolerance = options?.moveTolerance ?? HAPTIC_LONG_PRESS_MOVE_TOLERANCE_PX;
  const onTriggerRef = useRef(onTrigger);
  const timerRef = useRef<number | null>(null);
  const originRef = useRef<{ x: number; y: number } | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const armedRef = useRef(false);

  useEffect(() => {
    onTriggerRef.current = onTrigger;
  }, [onTrigger]);

  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    originRef.current = null;
    pointerIdRef.current = null;
    armedRef.current = false;
  }, []);

  useEffect(() => {
    const abortOnScroll = () => {
      if (armedRef.current) cancel();
    };
    document.addEventListener('scroll', abortOnScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener('scroll', abortOnScroll, true);
      cancel();
    };
  }, [cancel]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      cancel();
      armedRef.current = true;
      pointerIdRef.current = event.pointerId;
      originRef.current = { x: event.clientX, y: event.clientY };
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        armedRef.current = false;
        originRef.current = null;
        pulseHaptic();
        onTriggerRef.current();
      }, delay);
    },
    [cancel, delay]
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const origin = originRef.current;
      if (!origin || !armedRef.current) return;
      if (pointerIdRef.current !== null && event.pointerId !== pointerIdRef.current) return;
      if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > moveTolerance) {
        cancel();
      }
    },
    [cancel, moveTolerance]
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (pointerIdRef.current !== null && event.pointerId !== pointerIdRef.current) return;
      cancel();
    },
    [cancel]
  );

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    onPointerLeave: onPointerUp,
  };
}
