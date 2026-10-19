'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type HomeCarouselActionCardProps = {
  href: string;
  label: string;
  icon: ReactNode;
  className: string;
};

export function HomeCarouselActionCard({
  href,
  label,
  icon,
  className,
}: HomeCarouselActionCardProps) {
  return (
    <Link
      href={href}
      role="listitem"
      className={cn(
        'group flex shrink-0 snap-start flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-center backdrop-blur-md transition-colors duration-200 hover:border-orange-500/40 hover:bg-orange-500/[0.08] active:scale-[0.98]',
        className
      )}
    >
      <span className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-full border border-orange-500/40 bg-orange-500/15 text-orange-300">
        {icon}
      </span>
      <span className="text-[13px] font-semibold leading-snug tracking-tight text-white">
        {label}
      </span>
    </Link>
  );
}
