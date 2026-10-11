'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useRef, useSyncExternalStore } from 'react';
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
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const hydratedRef = useRef(false);

  useEffect(() => {
    setLocale(getLocale());
  }, [locale]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || hydratedRef.current) return;
    hydratedRef.current = true;
    let cancelled = false;

    void getToken({ skipCache: true })
      .then((token) =>
        fetch('/api/user/language', {
          cache: 'no-store',
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
      )
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { language?: unknown } | null) => {
        if (cancelled || !payload?.language) return;
        setLocale(payload.language);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [getToken, isLoaded, isSignedIn]);

  return children;
}
