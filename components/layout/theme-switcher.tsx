'use client';

import { memo, useCallback, useSyncExternalStore } from 'react';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { cn } from '@/lib/utils';

export type AppTheme = 'dark' | 'light' | 'system';

const THEMES: Array<{
  id: AppTheme;
  title: string;
  subtitle: string;
  description: string;
  icon: typeof Moon;
  preview: string;
}> = [
  {
    id: 'dark',
    title: 'Escuro',
    subtitle: 'Dark Luxury',
    description: 'Grafite profundo e neon laranja para sessões noturnas.',
    icon: Moon,
    preview: 'from-[#0a0a0a] via-[#1a1a1a] to-[#2a1810]',
  },
  {
    id: 'light',
    title: 'Claro',
    subtitle: 'Studio Clean',
    description: 'Superfície clara de estúdio, leitura confortável à luz do dia.',
    icon: Sun,
    preview: 'from-[#FAFAFA] via-[#FFFFFF] to-[#F3E6DA]',
  },
  {
    id: 'system',
    title: 'Padrão do Sistema',
    subtitle: 'Automático',
    description: 'Acompanha o tema do seu dispositivo automaticamente.',
    icon: Monitor,
    preview: 'from-[#0a0a0a] via-[#FAFAFA] to-[#F97316]/30',
  },
];

const emptySubscribe = () => () => undefined;

export const ThemeSwitcher = memo(function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const { triggerHaptic } = useHapticFeedback();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  const active = (mounted ? theme : 'dark') as AppTheme;

  const handleSelect = useCallback(
    (next: AppTheme) => {
      triggerHaptic('light');
      setTheme(next);
    },
    [setTheme, triggerHaptic]
  );

  return (
    <div role="radiogroup" aria-label="Seleção de tema" className="space-y-2">
      {THEMES.map((option) => {
        const Icon = option.icon;
        const selected = active === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => handleSelect(option.id)}
            className={cn(
              'group flex min-h-11 w-full transform-gpu items-center gap-3 rounded-2xl border px-3 py-3 text-left',
              'transition-[transform,background-color,border-color,box-shadow] duration-100 ease-out active:scale-[0.97]',
              selected
                ? 'border-[#F97316]/30 bg-[#F97316]/5 shadow-[0_0_16px_rgba(249,115,22,0.16)]'
                : 'border-[#EAEAEA] bg-black/[0.02] hover:border-[#F97316]/40 dark:border-white/5 dark:bg-white/[0.02]'
            )}
          >
            <span
              className={cn(
                'flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-xl border transition-all duration-200',
                selected
                  ? 'border-[#F97316]/50 bg-[#F97316]/15 text-[#F97316]'
                  : 'border-neutral-200 bg-white text-neutral-500 dark:border-neutral-800 dark:bg-white/5 dark:text-zinc-400'
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-neutral-900 dark:text-white">
                {option.title}
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-neutral-500 dark:text-zinc-500">
                {option.subtitle} · {option.description}
              </span>
            </span>
            <span
              className={cn(
                'flex h-6 w-6 min-h-6 min-w-6 items-center justify-center rounded-full transition-all duration-200',
                selected
                  ? 'scale-100 bg-emerald-500 text-white opacity-100 shadow-[0_0_14px_rgba(16,185,129,0.5)]'
                  : 'scale-75 bg-transparent text-transparent opacity-0'
              )}
              aria-hidden
            >
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
          </button>
        );
      })}
    </div>
  );
});
