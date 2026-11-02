'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { useMemo, useSyncExternalStore } from 'react';
import { CLERK_DARK_LUXURY_APPEARANCE } from '@/lib/clerk/appearance';
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
      appearance={CLERK_DARK_LUXURY_APPEARANCE}
      signInUrl="/login"
      signUpUrl="/register"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
      afterSignOutUrl="/"
      taskUrls={CLERK_TASK_URLS}
    >
      <div
        id="clerk-captcha"
        aria-hidden
        data-cl-theme="dark"
        data-cl-size="flexible"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: 300,
          height: 65,
          margin: 0,
          transform: 'translate(-100%, -100%)',
          overflow: 'visible',
        }}
      />
      {children}
    </ClerkProvider>
  );
}
