'use client';

import { memo } from 'react';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { cn } from '@/lib/utils';

export interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  ariaLabel?: string;
}

function SegmentedControlBase<T extends string>({
  options,
  value,
  onChange,
  className,
  ariaLabel = 'Navegação',
}: SegmentedControlProps<T>) {
  const { triggerHaptic } = useHapticFeedback();
  const activeIndex = Math.max(0, options.findIndex((option) => option.value === value));

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'relative grid w-full rounded-2xl border border-[#EAEAEA] bg-black/[0.03] p-1 backdrop-blur-xl',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:border-white/5 dark:bg-white/[0.04]',
        className
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute top-1 bottom-1 transform-gpu rounded-xl border border-orange-400/40 bg-gradient-to-b from-orange-500 to-orange-600 shadow-[0_0_18px_rgba(249,115,22,0.42)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(calc(${activeIndex} * 100%))`,
          left: '0.25rem',
        }}
      />
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => {
              if (option.value === value) return;
              triggerHaptic('light');
              onChange(option.value);
            }}
            className={cn(
              'relative z-10 flex min-h-11 min-w-11 transform-gpu items-center justify-center rounded-xl px-3',
              'text-[13px] font-semibold tracking-tight transition-[transform,color] duration-100 ease-out',
              'active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/70',
              selected
                ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]'
                : 'text-neutral-500 hover:text-neutral-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export const SegmentedControl = memo(SegmentedControlBase) as typeof SegmentedControlBase;
