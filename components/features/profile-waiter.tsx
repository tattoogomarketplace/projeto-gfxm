'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { OnboardingLoadingScreen } from '@/components/features/onboarding-loading-screen';
import { isOnboardingGrace, markOnboardingGrace } from '@/lib/utils/session';
import {
  assignAppPath,
  destinationAfterProfileSync,
  LOGIN_PATH,
} from '@/lib/utils/auth-redirect';

const SIGNED_OUT_REDIRECT_MS = 8000;
const FETCH_TIMEOUT_MS = 8000;
const RETRY_DELAY_MS = 800;
const MAX_ATTEMPTS = 8;
const HARD_TIMEOUT_MS = 16000;

type EnsurePayload = {
  autenticado?: boolean;
  perfil?: {
    role?: string | null;
    kyc_status?: string | null;
    has_seen_welcome_notice?: boolean | null;
    onboarding_completed?: boolean | null;
  } | null;
  needsOnboarding?: boolean;
};

export function ProfileWaiter() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const navigatingRef = useRef(false);
  const [failed, setFailed] = useState(false);

  const leave = useCallback((path: string) => {
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    markOnboardingGrace();
    assignAppPath(path);
  }, []);

  useEffect(() => {
    if (!isLoaded || failed) return;

    let cancelled = false;
    let attempts = 0;
    const retryTimers: number[] = [];

    const run = async () => {
      if (cancelled || navigatingRef.current) return;

      const controller = new AbortController();
      const abortTimer = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        const token = await getToken({ skipCache: true });
        if (cancelled || navigatingRef.current) return;
        const response = await fetch('/api/perfil/ensure', {
          cache: 'no-store',
          credentials: 'include',
          signal: controller.signal,
          headers: {
            accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (cancelled || navigatingRef.current) return;
        if (response.status === 401) {
          throw new Error('session-initializing');
        }
        if (response.status !== 200) {
          throw new Error('perfil-pending');
        }
        const payload = (await response.json().catch(() => ({}))) as EnsurePayload;
        if (payload?.autenticado === false) {
          if (isOnboardingGrace()) {
            throw new Error('session-initializing');
          }
          leave(LOGIN_PATH);
          return;
        }
        if (!payload?.perfil) {
          throw new Error('perfil-pending');
        }
        leave(destinationAfterProfileSync(payload.perfil, payload.needsOnboarding));
      } catch {
        if (cancelled || navigatingRef.current) return;
        attempts += 1;
        if (attempts < MAX_ATTEMPTS) {
          retryTimers.push(
            window.setTimeout(() => {
              if (!cancelled) void run();
            }, RETRY_DELAY_MS)
          );
          return;
        }
        setFailed(true);
      } finally {
        window.clearTimeout(abortTimer);
      }
    };

    if (isSignedIn) {
      void run();
    }

    const signedOutTimer =
      !isSignedIn && !isOnboardingGrace()
        ? window.setTimeout(() => {
            if (cancelled || navigatingRef.current || isOnboardingGrace()) return;
            leave(LOGIN_PATH);
          }, SIGNED_OUT_REDIRECT_MS)
        : undefined;

    const hardTimer = window.setTimeout(() => {
      if (!cancelled && !navigatingRef.current) setFailed(true);
    }, HARD_TIMEOUT_MS);

    return () => {
      cancelled = true;
      if (signedOutTimer) window.clearTimeout(signedOutTimer);
      window.clearTimeout(hardTimer);
      retryTimers.forEach((id) => window.clearTimeout(id));
    };
  }, [isLoaded, isSignedIn, failed, getToken, leave]);

  const handleRetry = useCallback(() => {
    navigatingRef.current = false;
    setFailed(false);
  }, []);

  return (
    <OnboardingLoadingScreen variant="sparkles">
      {failed ? (
        <button
          type="button"
          onClick={handleRetry}
          className="min-h-11 rounded-xl border border-orange-500/40 bg-orange-500/10 px-5 text-sm font-semibold text-orange-400 shadow-[0_0_18px_rgba(249,115,22,0.25)] transition-colors hover:bg-orange-500/20"
        >
          Tentar novamente
        </button>
      ) : null}
    </OnboardingLoadingScreen>
  );
}

export default ProfileWaiter;
