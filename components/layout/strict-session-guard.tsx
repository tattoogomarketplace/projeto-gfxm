'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { checkCurrentSession } from '@/app/actions/auth-actions';
import {
  isIntentionalSignOut,
  isOnboardingGrace,
  resetIntentionalSignOut,
} from '@/lib/utils/session';

const VISIBILITY_THROTTLE_MS = 60_000;

export function StrictSessionGuard() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const wasSignedIn = useRef(false);
  const redirected = useRef(false);
  const lastVisibilityCheckAt = useRef(0);

  const kickToLogin = useCallback(() => {
    if (redirected.current) return;
    redirected.current = true;
    router.replace('/login');
  }, [router]);

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      wasSignedIn.current = true;
      redirected.current = false;
      return;
    }

    if (!wasSignedIn.current || redirected.current) return;
    if (isIntentionalSignOut()) {
      resetIntentionalSignOut();
      wasSignedIn.current = false;
      return;
    }
    if (isOnboardingGrace()) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const { status } = await checkCurrentSession();
          if (cancelled || redirected.current) return;
          if (status === 'active' || status === 'unknown') return;
        } catch {
          return;
        }
        if (!cancelled) kickToLogin();
      })();
    }, 2000);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isLoaded, isSignedIn, kickToLogin]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || redirected.current) return;

    let stopped = false;

    const verify = async () => {
      if (stopped || redirected.current) return;
      const now = Date.now();
      if (now - lastVisibilityCheckAt.current < VISIBILITY_THROTTLE_MS) return;
      lastVisibilityCheckAt.current = now;
      try {
        const { status } = await checkCurrentSession();
        if (!stopped && status === 'revoked') {
          if (isOnboardingGrace()) return;
          kickToLogin();
        }
      } catch {
        return;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void verify();
    };

    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isLoaded, isSignedIn, kickToLogin]);

  return null;
}
