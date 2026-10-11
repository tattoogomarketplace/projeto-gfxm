'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { useMemo, useSyncExternalStore } from 'react';
import { CLERK_LOCALIZATIONS } from '@/lib/i18n/clerk';
import {
  getLocaleServerSnapshot,
  getLocaleSnapshot,
  subscribeLocale,
} from '@/lib/i18n/store';
import { CLERK_TASK_URLS } from '@/lib/utils/session-tasks';

export function LocalizedClerkProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(
    subscribeLocale,
    getLocaleSnapshot,
    getLocaleServerSnapshot
  );
  const localization = useMemo(() => CLERK_LOCALIZATIONS[locale], [locale]);

  return (
    <ClerkProvider
      localization={localization}
      signInUrl="/login"
      signUpUrl="/register"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      afterSignOutUrl="/"
      taskUrls={CLERK_TASK_URLS}
    >
      {children}
    </ClerkProvider>
  );
}
