'use client';

import { useUiStore } from '@/hooks/use-ui-store';

type HapticKind = 'light' | 'medium' | 'heavy' | 'success';

const PATTERNS: Record<HapticKind, number | number[]> = {
  light: 10,
  medium: 30,
  heavy: 60,
  success: [30, 50, 30],
};

export function triggerNativeVibrate(type: HapticKind = 'light') {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  const enabled = useUiStore.getState().hapticsEnabled;
  if (!enabled) return;
  navigator.vibrate(PATTERNS[type]);
}

export const useHapticFeedback = () => {
  const hapticsEnabled = useUiStore((s) => s.hapticsEnabled);

  const triggerHaptic = (type: HapticKind = 'light') => {
    if (!hapticsEnabled) return;
    triggerNativeVibrate(type);
  };

  return { triggerHaptic, hapticsEnabled };
};
