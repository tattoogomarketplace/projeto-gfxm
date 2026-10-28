'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PersistentTabPane({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        'flex min-h-0 min-w-0 w-full flex-1 flex-col transform-gpu will-change-[opacity] [backface-visibility:hidden] [transform:translateZ(0)]',
        active
          ? 'relative z-10 opacity-100'
          : 'pointer-events-none invisible absolute inset-0 z-0 opacity-0'
      )}
      aria-hidden={!active}
      inert={!active ? true : undefined}
    >
      {children}
    </section>
  );
}
