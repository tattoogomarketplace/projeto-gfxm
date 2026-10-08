import React from 'react';
import { cn } from '@/lib/utils';

interface GlassContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const GlassContainer = ({ children, className = '' }: GlassContainerProps) => (
  <div
    style={{
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      backdropFilter: 'blur(24px) saturate(180%)',
    }}
    className={cn(
       'rounded-2xl border border-[#EAEAEA] bg-white/80 text-neutral-900 shadow-[0_2px_8px_rgba(0,0,0,0.05)]',
       'dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:shadow-none',
      className
    )}
  >
    {children}
  </div>
);
