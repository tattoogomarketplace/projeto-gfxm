'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { cn } from '@/lib/utils';

export interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
  icon?: ReactNode;
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
  const columns = Math.max(1, options.length);

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'relative grid w-full rounded-2xl p-1',
        'bg-white/10 backdrop-blur-2xl',
        'border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
        className
      )}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      <motion.span
        aria-hidden
        className={cn(
          'pointer-events-none absolute top-1 bottom-1 rounded-xl',
          'bg-white/15 shadow-[0_8px_24px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.22)]',
          'ring-1 ring-white/10 backdrop-blur-xl'
        )}
        initial={false}
        animate={{ x: `calc(${activeIndex} * 100%)` }}
        transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.7 }}
        style={{
          width: `calc((100% - 0.5rem) / ${columns})`,
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
              'relative z-10 flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl px-3',
              'text-[13px] font-semibold tracking-tight transition-colors duration-200',
              'active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/70',
              selected ? 'text-white' : 'text-zinc-400'
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export type ThemePreference = 'light' | 'dark' | 'system';

const THEME_OPTIONS: SegmentOption<ThemePreference>[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
  { value: 'system', label: 'Sistema' },
];

interface ThemeSegmentedControlProps {
  value: ThemePreference;
  onChange: (value: ThemePreference) => void;
  className?: string;
}

export function ThemeSegmentedControl({ value, onChange, className }: ThemeSegmentedControlProps) {
  const [systemDark, setSystemDark] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => setSystemDark(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  const resolved = useMemo<ThemePreference>(() => {
    if (value !== 'system') return value;
    return systemDark ? 'dark' : 'light';
  }, [systemDark, value]);

  return (
    <div className={cn('space-y-2', className)}>
      <SegmentedControl
        options={THEME_OPTIONS}
        value={value}
        onChange={onChange}
        ariaLabel="Seleção de tema"
      />
      <p className="px-1 text-[11px] text-zinc-500">
        Sistema: {systemDark ? 'Escuro' : 'Claro'} via matchMedia. Ativo: {resolved === 'dark' ? 'Escuro' : 'Claro'}.
      </p>
    </div>
  );
}
