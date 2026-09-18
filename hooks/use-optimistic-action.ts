'use client';

import { useCallback, useRef } from 'react';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';

type HapticKind = 'light' | 'medium' | 'heavy' | 'success';

interface OptimisticActionOptions<T> {
  apply: () => T | void;
  commit: () => Promise<unknown>;
  rollback: (snapshot: T | void) => void;
  haptic?: HapticKind;
}

export function useOptimisticAction() {
  const { triggerHaptic } = useHapticFeedback();
  const inflight = useRef(0);

  const run = useCallback(
    async <T,>({ apply, commit, rollback, haptic = 'medium' }: OptimisticActionOptions<T>) => {
      inflight.current += 1;
      triggerHaptic(haptic);
      const snapshot = apply();
      try {
        await commit();
        return true;
      } catch {
        rollback(snapshot);
        triggerHaptic('heavy');
        return false;
      } finally {
        inflight.current -= 1;
      }
    },
    [triggerHaptic]
  );

  return { runOptimistic: run, triggerHaptic };
}
