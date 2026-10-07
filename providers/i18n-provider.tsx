'use client';

import { useEffect, useSyncExternalStore } from 'react';
import {
  getLocale,
  getLocaleServerSnapshot,
  getLocaleSnapshot,
  setLocale,
  subscribeLocale,
} from '@/lib/i18n/store';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(
    subscribeLocale,
    getLocaleSnapshot,
    getLocaleServerSnapshot
  );

  useEffect(() => {
    setLocale(getLocale());
  }, [locale]);

  return children;
}
