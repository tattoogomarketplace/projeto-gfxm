'use client';

import { useSyncExternalStore } from 'react';
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
    preview: 'from-[#121212] via-[#1a1a1a] to-[#2a1810]',
  },
  {
    id: 'light',
    title: 'Claro',
    subtitle: 'Studio Clean',
    description: 'Superfície clara de estúdio, leitura confortável à luz do dia.',
    icon: Sun,
    preview: 'from-[#F6F3EE] via-[#FFFDF9] to-[#F3E6DA]',
  },
  {
    id: 'system',
    title: 'Padrão do Sistema',
    subtitle: 'Automático',
    description: 'Acompanha o tema do seu dispositivo automaticamente.',
    icon: Monitor,
    preview: 'from-[#121212] via-[#F6F3EE] to-[#FF5722]/30',
  },
];

const emptySubscribe = () => () => undefined;

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const { triggerHaptic } = useHapticFeedback();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  const active = (mounted ? theme : 'dark') as AppTheme;

  const handleSelect = (next: AppTheme) => {
    triggerHaptic('light');
    setTheme(next);
  };

  return (
    <div
      role="radiogroup"
      aria-label="Seleção de tema"
      className="grid grid-cols-1 gap-3 sm:grid-cols-3"
    >
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
              'group relative flex min-h-11 w-full flex-col overflow-hidden rounded-2xl border p-4 text-left',
              'bg-white dark:bg-[#121212]',
              'transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]',
              selected
                ? 'border-[#FF5722] ring-2 ring-[#FF5722]/20 shadow-[0_0_24px_rgba(255,87,34,0.22)]'
                : 'border-neutral-200 hover:border-[#FF5722]/40 dark:border-neutral-800'
            )}
          >
            <div
              aria-hidden
              className={cn(
                'mb-4 h-16 w-full rounded-xl border border-neutral-200 bg-gradient-to-br dark:border-neutral-800',
                option.preview
              )}
            />
            <span
              className={cn(
                'mb-3 flex h-11 w-11 items-center justify-center rounded-xl border transition-all duration-300',
                selected
                  ? 'border-[#FF5722]/60 bg-[#FF5722]/15 text-[#FF5722] shadow-[0_0_18px_rgba(255,87,34,0.28)]'
                  : 'border-neutral-200 bg-neutral-50 text-neutral-600 dark:border-neutral-800 dark:bg-white/5 dark:text-zinc-300'
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#FF5722]">
              {option.subtitle}
            </span>
            <span className="mt-1 text-base font-bold text-neutral-900 dark:text-white">
              {option.title}
            </span>
            <span className="mt-1 text-xs leading-relaxed text-neutral-600 dark:text-zinc-400">
              {option.description}
            </span>
            <span
              className={cn(
                'absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full transition-all duration-300',
                selected
                  ? 'scale-100 bg-[#FF5722] text-black opacity-100'
                  : 'scale-75 bg-white/10 text-transparent opacity-0'
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
}
