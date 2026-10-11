'use client';

import { memo, useCallback, useSyncExternalStore, type MouseEvent } from 'react';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import type { MessageKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export type AppTheme = 'dark' | 'light' | 'system';

const THEMES: Array<{
  id: AppTheme;
  titleKey: MessageKey;
  subtitleKey: MessageKey;
  descriptionKey: MessageKey;
  icon: typeof Moon;
  preview: string;
}> = [
  {
    id: 'dark',
    titleKey: 'theme.dark',
    subtitleKey: 'theme.darkSubtitle',
    descriptionKey: 'theme.darkDescription',
    icon: Moon,
    preview: 'from-[#0a0a0a] via-[#1a1a1a] to-[#2a1810]',
  },
  {
    id: 'light',
    titleKey: 'theme.light',
    subtitleKey: 'theme.lightSubtitle',
    descriptionKey: 'theme.lightDescription',
    icon: Sun,
    preview: 'from-[#FAFAFA] via-[#FFFFFF] to-[#F3E6DA]',
  },
  {
    id: 'system',
    titleKey: 'theme.system',
    subtitleKey: 'theme.systemSubtitle',
    descriptionKey: 'theme.systemDescription',
    icon: Monitor,
    preview: 'from-[#0a0a0a] via-[#FAFAFA] to-[#F97316]/30',
  },
];

const emptySubscribe = () => () => undefined;

export const ThemeSwitcher = memo(function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const { triggerHaptic } = useHapticFeedback();
  const { t } = useI18n();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  const active = (mounted ? theme : 'dark') as AppTheme;

  const handleSelect = useCallback(
    (next: AppTheme) => {
      triggerHaptic('light');
      setTheme(next);
    },
    [setTheme, triggerHaptic]
  );

  const onThemeClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>, next: AppTheme) => {
      event.preventDefault();
      event.stopPropagation();
      handleSelect(next);
    },
    [handleSelect]
  );

  return (
    <div role="radiogroup" aria-label={t('aria.themeSelect')} className="space-y-2">
      {THEMES.map((option) => {
        const Icon = option.icon;
        const selected = active === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={(event) => onThemeClick(event, option.id)}
            className={cn(
              'group flex min-h-11 w-full transform-gpu items-center gap-3 rounded-2xl border px-3 py-3 text-left',
              'transition-[transform,background-color,border-color,box-shadow] duration-100 ease-out active:scale-[0.97]',
              selected
                ? 'border-[#F97316]/30 bg-[#F97316]/5 shadow-[0_0_16px_rgba(249,115,22,0.16)]'
                : 'border-black/[0.04] bg-black/[0.02] hover:border-[#F97316]/40 dark:border-white/5 dark:bg-white/[0.02]'
            )}
          >
            <span
              className={cn(
                'flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-xl border transition-all duration-200',
                selected
                  ? 'border-[#F97316]/50 bg-[#F97316]/15 text-[#F97316]'
                  : 'border-black/[0.04] bg-white text-neutral-500 dark:border-white/[0.05] dark:bg-white/5 dark:text-zinc-400'
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-gray-900 dark:text-white">
                {t(option.titleKey)}
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-neutral-500 dark:text-zinc-500">
                {t(option.subtitleKey)} · {t(option.descriptionKey)}
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
