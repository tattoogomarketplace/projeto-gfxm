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

const POLL_INTERVAL_MS = 4000;

/**
 * Global enforcer of the strict single-device policy.
 *
 * Listens to Clerk's `useAuth()`. When a remote revocation arrives over
 * Clerk's websocket (`isSignedIn` flips to false), the old device is sent to
 * `/login` immediately. Polling covers the gap before the websocket fires.
 */
export function StrictSessionGuard() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const wasSignedIn = useRef(false);
  const redirected = useRef(false);

  const kickToLogin = useCallback(() => {
    if (redirected.current) return;
    redirected.current = true;
    router.push('/login');
  }, [router]);

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      wasSignedIn.current = true;
      return;
    }

    if (wasSignedIn.current && !redirected.current) {
      if (isIntentionalSignOut()) {
        resetIntentionalSignOut();
        wasSignedIn.current = false;
        return;
      }
      if (isOnboardingGrace()) {
        return;
      }
      kickToLogin();
    }
  }, [isLoaded, isSignedIn, kickToLogin]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || redirected.current) return;

    let stopped = false;

    const verify = async () => {
      if (stopped || redirected.current) return;
      try {
        const { status } = await checkCurrentSession();
        if (!stopped && status === 'revoked') {
          if (isOnboardingGrace()) return;
          kickToLogin();
        }
      } catch {
        // Falha de rede: não pune o usuário, apenas tenta no próximo ciclo.
      }
    };

    const interval = window.setInterval(verify, POLL_INTERVAL_MS);
    const onFocus = () => void verify();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void verify();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    void verify();

    return () => {
      stopped = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isLoaded, isSignedIn, kickToLogin]);

  return null;
}
