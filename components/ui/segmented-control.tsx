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
        'relative grid w-full rounded-2xl bg-white/10 p-1 backdrop-blur-xl',
        'border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
        className
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute top-1 bottom-1 rounded-xl bg-[#1E1E1E] shadow-[0_8px_24px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.08)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
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
              selected ? 'text-white' : 'text-zinc-400'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
