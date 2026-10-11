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
    <div
      className={cn(
        'form-page screen-fade-in relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-background text-foreground select-none',
        className
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-none px-4 pb-36 pt-[max(1.25rem,env(safe-area-inset-top))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] [-webkit-overflow-scrolling:touch]">
        <div className="my-auto flex w-full max-w-md flex-col items-center">
          {children}
        </div>
      </div>
    </div>
  );
}

export const AuthScreen = memo(AuthScreenBase);
