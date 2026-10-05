'use client';

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

export function SegmentedControl<T extends string>({
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
        'relative grid w-full rounded-2xl bg-neutral-100 p-1 backdrop-blur-xl dark:bg-white/10',
        'border border-neutral-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:border-white/10',
        className
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute top-1 bottom-1 rounded-xl border border-orange-500/30 bg-gradient-to-b from-orange-500/30 to-orange-500/10 shadow-[0_0_18px_rgba(249,115,22,0.35),inset_0_1px_0_rgba(255,255,255,0.1)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
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
              'relative z-10 flex min-h-11 min-w-11 items-center justify-center rounded-xl px-3',
              'text-[13px] font-semibold tracking-tight transition-colors duration-200',
              'active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/70',
              selected
                ? 'text-orange-700 drop-shadow-[0_0_10px_rgba(249,115,22,0.45)] dark:text-orange-200'
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
