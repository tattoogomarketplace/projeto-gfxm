'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_LABELS,
  getDictionary,
  getLocaleServerSnapshot,
  getLocaleSnapshot,
  setLocale as persistLocale,
  subscribeLocale,
  t as translate,
  type Locale,
  type MessageKey,
  type TranslateVars,
} from '@/lib/i18n';

export function useI18n() {
  const locale = useSyncExternalStore(
    subscribeLocale,
    getLocaleSnapshot,
    getLocaleServerSnapshot
  );

  const dictionary = useMemo(() => getDictionary(locale), [locale]);

  const t = useCallback(
    (key: MessageKey, vars?: TranslateVars) => translate(key, vars, locale),
    [locale]
  );

  const setLocale = useCallback((next: Locale | string) => persistLocale(next), []);

  return {
    locale,
    locales: LOCALES,
    labels: LOCALE_LABELS,
    defaultLocale: DEFAULT_LOCALE,
    dictionary,
    t,
    setLocale,
  };
}
