'use client';

import { useCallback, useRef } from 'react';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';

const EDGE_ZONE = 28;
const SWIPE_BACK_DX = 72;
const PULL_DISMISS_DY = 96;
const VELOCITY = 0.45;

export interface NativeGestureHandlers {
  onPointerDown: (event: React.PointerEvent) => void;
  onPointerMove: (event: React.PointerEvent) => void;
  onPointerUp: (event: React.PointerEvent) => void;
  onPointerCancel: () => void;
}

export function useNativeGestures(onDismiss: () => void, enabled = true) {
  const { triggerHaptic } = useHapticFeedback();
  const origin = useRef<{ x: number; y: number; edge: boolean } | null>(null);
  const fired = useRef(false);

  const reset = useCallback(() => {
    origin.current = null;
    fired.current = false;
  }, []);

  const maybeDismiss = useCallback(() => {
    if (fired.current) return;
    fired.current = true;
    triggerHaptic('light');
    onDismiss();
  }, [onDismiss, triggerHaptic]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (!enabled) return;
      origin.current = {
        x: event.clientX,
        y: event.clientY,
        edge: event.clientX <= EDGE_ZONE,
      };
      fired.current = false;
    },
    [enabled]
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!enabled || !origin.current || fired.current) return;
      const dx = event.clientX - origin.current.x;
      const dy = event.clientY - origin.current.y;

      if (origin.current.edge && dx > SWIPE_BACK_DX && Math.abs(dx) > Math.abs(dy) * 1.15) {
        maybeDismiss();
        return;
      }

      if (dy > PULL_DISMISS_DY && dy > Math.abs(dx) * 1.25) {
        maybeDismiss();
      }
    },
    [enabled, maybeDismiss]
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent) => {
      if (!enabled || !origin.current || fired.current) {
        reset();
        return;
      }
      const dx = event.clientX - origin.current.x;
      const dy = event.clientY - origin.current.y;
      if (origin.current.edge && dx > SWIPE_BACK_DX) maybeDismiss();
      else if (dy > PULL_DISMISS_DY && dy > Math.abs(dx)) maybeDismiss();
      reset();
    },
    [enabled, maybeDismiss, reset]
  );

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: reset,
  } satisfies NativeGestureHandlers;
}

export function shouldDismissFromPan(info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }) {
  const swipeBack =
    info.offset.x > SWIPE_BACK_DX || (info.velocity.x > VELOCITY && info.offset.x > 36);
  const pullDown =
    info.offset.y > PULL_DISMISS_DY || (info.velocity.y > VELOCITY && info.offset.y > 48);
  return swipeBack || pullDown;
}
