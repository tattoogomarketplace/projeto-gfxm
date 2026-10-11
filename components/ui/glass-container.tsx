import React from 'react';
import { cn } from '@/lib/utils';

interface GlassContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const GlassContainer = ({ children, className = '' }: GlassContainerProps) => (
  <div
    style={{
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      backdropFilter: 'blur(12px) saturate(180%)',
    }}
    className={cn(
       'min-w-0 w-full rounded-2xl border border-black/[0.04] bg-white text-gray-900 shadow-[0_2px_10px_rgba(0,0,0,0.04)]',
       'dark:border-white/[0.05] dark:bg-white/[0.03] dark:text-white dark:shadow-none',
      className
    )}
  >
    {children}
  </div>
);
