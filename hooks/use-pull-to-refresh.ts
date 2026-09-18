'use client';

import { useCallback, useRef, useState } from 'react';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';

const THRESHOLD = 72;

export function usePullToRefresh(onRefresh: () => Promise<void> | void) {
  const { triggerHaptic } = useHapticFeedback();
  const startY = useRef<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onTouchStart = useCallback((event: React.TouchEvent<HTMLElement>) => {
    const node = event.currentTarget;
    if (node.scrollTop > 0 || refreshing) return;
    startY.current = event.touches[0]?.clientY ?? null;
  }, [refreshing]);

  const onTouchMove = useCallback((event: React.TouchEvent<HTMLElement>) => {
    if (startY.current == null || refreshing) return;
    const dy = (event.touches[0]?.clientY ?? 0) - startY.current;
    if (dy > 0) setOffset(Math.min(dy * 0.46, 112));
  }, [refreshing]);

  const onTouchEnd = useCallback(async () => {
    if (startY.current == null) return;
    const shouldRefresh = offset >= THRESHOLD && !refreshing;
    startY.current = null;
    if (!shouldRefresh) {
      setOffset(0);
      return;
    }
    triggerHaptic('medium');
    setRefreshing(true);
    setOffset(56);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
      setOffset(0);
    }
  }, [offset, onRefresh, refreshing, triggerHaptic]);

  return { offset, refreshing, onTouchStart, onTouchMove, onTouchEnd };
}
