'use client';

import { memo, type ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type SettingsRowProps = {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  href?: string;
  onClick?: () => void;
  chevron?: boolean;
  className?: string;
};

export const SettingsRow = memo(function SettingsRow({
  icon,
  title,
  subtitle,
  trailing,
  href,
  onClick,
  chevron = false,
  className,
}: SettingsRowProps) {
  const inner = (
    <>
      <span className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-500 dark:text-orange-400">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold tracking-tight text-neutral-900 dark:text-white">{title}</span>
        {subtitle ? (
          <span className="mt-0.5 block text-xs leading-relaxed text-neutral-500 dark:text-zinc-500">
            {subtitle}
          </span>
        ) : null}
      </span>
      {trailing}
      {chevron ? (
        <ChevronRight
          className="h-5 w-5 min-h-5 min-w-5 shrink-0 text-zinc-500 transition-colors duration-200 group-hover:text-orange-500"
          strokeWidth={1.75}
        />
      ) : null}
    </>
  );

  const classes = cn(
    'group flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 py-3 text-left',
    'border-black/[0.04] bg-neutral-50 dark:border-white/[0.05] dark:bg-white/5',
    'transform-gpu backface-hidden transition-colors duration-200 hover:border-orange-500/40 hover:bg-orange-500/5',
    (href || onClick) && 'active:scale-[0.98]',
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {inner}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {inner}
      </button>
    );
  }

  return <div className={classes}>{inner}</div>;
});
