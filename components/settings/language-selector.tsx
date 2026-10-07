'use client';

import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Check, ChevronRight, Languages, Search } from 'lucide-react';
import { SettingsRow } from '@/components/settings/settings-row';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { authedFetch } from '@/lib/utils/authed-fetch';
import { cn } from '@/lib/utils';
import type { Locale } from '@/lib/i18n/types';

const LOCALE_GLYPHS: Record<Locale, string> = {
  'pt-BR': 'PT',
  en: 'EN',
  es: 'ES',
  fr: 'FR',
  de: 'DE',
  it: 'IT',
  ja: 'あ',
  zh: '中',
  ko: '한',
  ar: 'ع',
  ru: 'Я',
  hi: 'ह',
  nl: 'NL',
  tr: 'TR',
  pl: 'PL',
};

function persistLanguage(
  language: Locale,
  getToken: () => Promise<string | null>,
  signal: AbortSignal
) {
  return authedFetch(
    '/api/user/language',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language }),
      signal,
    },
    getToken
  );
}

export const LanguageSelector = memo(function LanguageSelector() {
  const { locale, locales, labels, t, setLocale } = useI18n();
  const { getToken } = useAuth();
  const { triggerHaptic } = useHapticFeedback();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inflightRef = useRef<AbortController | null>(null);
  const tokenFn = useCallback(() => getToken({ skipCache: true }), [getToken]);

  const filteredLocales = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return locales;
    return locales.filter((id) => {
      const haystack = `${labels[id]} ${id} ${LOCALE_GLYPHS[id]}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [labels, locales, query]);

  const handleToggle = useCallback(() => {
    triggerHaptic('light');
    setOpen((current) => !current);
  }, [triggerHaptic]);

  const handleSelect = useCallback(
    (next: Locale) => {
      triggerHaptic(next === locale ? 'light' : 'success');
      if (next === locale) return;
      setLocale(next);
      inflightRef.current?.abort();
      const controller = new AbortController();
      inflightRef.current = controller;
      void persistLanguage(next, tokenFn, controller.signal).catch(() => {});
    },
    [locale, setLocale, tokenFn, triggerHaptic]
  );

  return (
    <div className="gpu-layer contain-paint transform-gpu backface-hidden will-change-transform">
      <SettingsRow
        icon={<Languages className="h-5 w-5" strokeWidth={1.75} />}
        title={t('settings.language')}
        subtitle={labels[locale]}
        onClick={handleToggle}
        trailing={
          <span className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-orange-500 dark:text-orange-400">
              {t('settings.languageActive')}
            </span>
            <ChevronRight
              className={cn(
                'h-5 w-5 min-h-5 min-w-5 shrink-0 text-zinc-500 transform-gpu backface-hidden transition-transform duration-300 ease-out will-change-transform',
                open && 'rotate-90 text-orange-500'
              )}
              strokeWidth={1.75}
            />
          </span>
        }
      />

      <div
        className={cn(
          'grid transform-gpu backface-hidden transition-[grid-template-rows,opacity] duration-300 ease-out contain-paint',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden contain-paint transform-gpu backface-hidden">
          <div className="mt-2 space-y-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                strokeWidth={1.75}
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('common.search')}
                aria-label={t('common.search')}
                autoComplete="off"
                spellCheck={false}
                className="min-h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-sm text-neutral-900 outline-none transition-colors duration-200 placeholder:text-zinc-400 focus:border-[#F97316]/50 focus:ring-2 focus:ring-[#F97316]/20 dark:border-neutral-800 dark:bg-white/5 dark:text-white"
              />
            </div>

            <div
              role="radiogroup"
              aria-label={t('settings.language')}
              className="max-h-[min(22rem,50vh)] space-y-2 overflow-y-auto overscroll-contain pr-1 transform-gpu backface-hidden will-change-transform [-webkit-overflow-scrolling:touch]"
            >
              {filteredLocales.map((id) => {
                const selected = locale === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => handleSelect(id)}
                    className={cn(
                      'group flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 py-3 text-left',
                      'transform-gpu backface-hidden transition-all duration-200 ease-out active:scale-[0.98]',
                      selected
                        ? 'border-[#F97316]/30 bg-[#F97316]/5 shadow-[0_0_16px_rgba(249,115,22,0.16)]'
                        : 'border-neutral-200 bg-neutral-50 hover:border-[#F97316]/40 dark:border-neutral-800 dark:bg-white/5'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl border text-[13px] font-semibold tracking-[0.06em] transition-all duration-200',
                        selected
                          ? 'border-[#F97316]/50 bg-[#F97316]/15 text-[#F97316]'
                          : 'border-neutral-200 bg-white text-neutral-500 dark:border-neutral-800 dark:bg-white/5 dark:text-zinc-400'
                      )}
                      aria-hidden
                    >
                      {LOCALE_GLYPHS[id]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold tracking-tight text-neutral-900 dark:text-white">
                        {labels[id]}
                      </span>
                      <span className="mt-0.5 block text-xs uppercase tracking-[0.14em] leading-relaxed text-neutral-500 dark:text-zinc-500">
                        {id}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'flex h-6 w-6 min-h-6 min-w-6 items-center justify-center rounded-full transition-all duration-200',
                        selected
                          ? 'scale-100 bg-[#F97316] text-white opacity-100'
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
          </div>
        </div>
      </div>
    </div>
  );
});
