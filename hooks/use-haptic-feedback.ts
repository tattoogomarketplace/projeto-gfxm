/**
 * TATTOOGO MK - HOOK DE HAPTIC FEEDBACK (APPLE-TIER)
 * Centraliza a resposta tátil para garantir consistência entre Android/iOS
 * e evitar chamadas órfãs ao navigator.vibrate.
 */

import { useCallback } from 'react';

const PATTERNS: Record<'light' | 'medium' | 'heavy' | 'success', number | number[]> = {
  light: 50,
  medium: 50,
  heavy: [200, 100, 200],
  success: [30, 50, 30],
};

export const useHapticFeedback = () => {
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' | 'success' = 'light') => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(PATTERNS[type]);
    }
  }, []);

  return { triggerHaptic };
};
