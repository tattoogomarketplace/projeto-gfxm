import React from 'react';
import { cn } from '@/lib/utils';

interface GlassContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const GlassContainer = ({ children, className = '' }: GlassContainerProps) => (
  <div
    className={cn(
       'rounded-xl border border-neutral-200 bg-white text-neutral-900 shadow-sm backdrop-blur-md',
       'dark:border-neutral-800 dark:bg-[#121212] dark:text-white dark:shadow-none',
      className
    )}
  >
    {children}
  </div>
);
