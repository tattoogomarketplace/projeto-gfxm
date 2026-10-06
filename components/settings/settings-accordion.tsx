'use client';

import { memo, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type SettingsAccordionProps = {
  id: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  open: boolean;
  onToggle: (id: string) => void;
  children: ReactNode;
  delayMs?: number;
};

export const SettingsAccordion = memo(function SettingsAccordion({
  id,
  title,
  subtitle,
  icon,
  open,
  onToggle,
  children,
  delayMs = 0,
}: SettingsAccordionProps) {
  return (
    <section
      id={`settings-section-${id}`}
      className="screen-fade-in overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-[#121212] dark:shadow-none"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`settings-panel-${id}`}
        onClick={() => onToggle(id)}
        className="group flex min-h-11 w-full items-center gap-3 px-4 py-4 text-left transition-all duration-200 active:scale-[0.98]"
      >
        <span className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl border border-orange-500/40 bg-orange-500/10 text-orange-500 dark:text-orange-400">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold tracking-tight text-neutral-900 dark:text-white">{title}</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-neutral-500 dark:text-zinc-500">
            {subtitle}
          </span>
        </span>
        <ChevronRight
          className={cn(
            'h-5 w-5 min-h-5 min-w-5 shrink-0 text-zinc-500 transition-transform duration-300 ease-out group-hover:text-orange-500',
            open && 'rotate-90 text-orange-500'
          )}
          strokeWidth={1.75}
        />
      </button>
      <div
        id={`settings-panel-${id}`}
        role="region"
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-neutral-200 px-4 py-4 dark:border-neutral-800">{children}</div>
        </div>
      </div>
    </section>
  );
});
