'use client';

import { memo } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type AuthScreenProps = {
  children: ReactNode;
  className?: string;
};

function AuthScreenBase({ children, className }: AuthScreenProps) {
  return (
    <div className={cn('relative w-full max-w-md overflow-y-visible text-white select-none', className)}>
      {children}
    </div>
  );
}

export const AuthScreen = memo(AuthScreenBase);
