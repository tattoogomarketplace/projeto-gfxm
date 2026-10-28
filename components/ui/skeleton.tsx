'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const SKELETON_DEBOUNCE_MS = 250;

export function Skeleton({ className }: { className?: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), SKELETON_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      className={cn(
        'luxury-skeleton relative overflow-hidden rounded-lg',
        !visible && 'opacity-0 [animation:none]',
        className
      )}
      aria-hidden
    />
  );
}
