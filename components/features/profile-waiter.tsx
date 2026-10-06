'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { OnboardingLoadingScreen } from '@/components/features/onboarding-loading-screen';
import { isOnboardingGrace } from '@/lib/utils/session';
import {
  assignAppPath,
  destinationAfterProfileSync,
  LOGIN_PATH,
  parseAppRole,
} from '@/lib/utils/auth-redirect';
import {
  fallbackDashboardPath,
  fetchPerfilEnsure,
  PERFIL_ENSURE_FETCH_TIMEOUT_MS,
  PERFIL_ENSURE_HARD_TIMEOUT_MS,
  PERFIL_ENSURE_MAX_ATTEMPTS,
  PERFIL_ENSURE_RETRY_DELAY_MS,
  PERFIL_ENSURE_SIGNED_OUT_MS,
} from '@/lib/utils/perfil-bootstrap';
import { useAuthStore } from '@/hooks/use-auth-store';

export function ProfileWaiter() {
  const { isLoaded: authLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const storedRole = useAuthStore((s) => s.role);
  const navigatingRef = useRef(false);
  const authRef = useRef({ authLoaded, isSignedIn, getToken });
  const roleRef = useRef<string | null>(null);

  useEffect(() => {
    authRef.current = { authLoaded, isSignedIn, getToken };
    roleRef.current = parseAppRole(
      (typeof user?.publicMetadata?.role === 'string' ? user.publicMetadata.role : null) ||
        (typeof user?.unsafeMetadata?.role === 'string' ? user.unsafeMetadata.role : null) ||
        storedRole
    );
  }, [authLoaded, isSignedIn, getToken, user, storedRole]);

  const leave = useCallback((path: string) => {
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    assignAppPath(path);
  }, []);

  const releaseToDashboard = useCallback(() => {
    leave(fallbackDashboardPath(roleRef.current));
  }, [leave]);

  useEffect(() => {
    if (navigatingRef.current) return;

    let cancelled = false;
    let attempts = 0;
    const retryTimers: number[] = [];

    const run = async () => {
      if (cancelled || navigatingRef.current) return;

      const controller = new AbortController();
      const abortTimer = window.setTimeout(
        () => controller.abort(),
        PERFIL_ENSURE_FETCH_TIMEOUT_MS
      );
      try {
        const { authLoaded: loaded, getToken: tokenFn } = authRef.current;
        let token: string | null = null;
        if (loaded) {
          token = await Promise.race([
            tokenFn({ skipCache: true }).catch(() => null),
            new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 2500)),
          ]);
        }
        if (cancelled || navigatingRef.current) return;

        const { status, payload } = await fetchPerfilEnsure({
          token,
          signal: controller.signal,
        });
        if (cancelled || navigatingRef.current) return;

        if (status === 401 || payload?.autenticado === false) {
          throw new Error('session-initializing');
        }

        if (status !== 200 || !payload?.perfil) {
          throw new Error('perfil-pending');
        }

        leave(destinationAfterProfileSync(payload.perfil, payload.needsOnboarding));
      } catch {
        if (cancelled || navigatingRef.current) return;
        attempts += 1;
        if (attempts < PERFIL_ENSURE_MAX_ATTEMPTS) {
          retryTimers.push(
            window.setTimeout(() => {
              if (!cancelled && !navigatingRef.current) void run();
            }, PERFIL_ENSURE_RETRY_DELAY_MS)
          );
          return;
        }
        const { authLoaded: loaded, isSignedIn: signedIn } = authRef.current;
        if (signedIn || !loaded || isOnboardingGrace()) {
          releaseToDashboard();
          return;
        }
        leave(LOGIN_PATH);
      } finally {
        window.clearTimeout(abortTimer);
      }
    };

    void run();

    const signedOutTimer = window.setTimeout(() => {
      if (cancelled || navigatingRef.current || isOnboardingGrace()) return;
      const { authLoaded: loaded, isSignedIn: signedIn } = authRef.current;
      if (!loaded || signedIn) {
        releaseToDashboard();
        return;
      }
      leave(LOGIN_PATH);
    }, PERFIL_ENSURE_SIGNED_OUT_MS);

    const hardTimer = window.setTimeout(() => {
      if (cancelled || navigatingRef.current) return;
      const { authLoaded: loaded, isSignedIn: signedIn } = authRef.current;
      if (loaded && !signedIn && !isOnboardingGrace()) {
        leave(LOGIN_PATH);
        return;
      }
      releaseToDashboard();
    }, PERFIL_ENSURE_HARD_TIMEOUT_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(signedOutTimer);
      window.clearTimeout(hardTimer);
      retryTimers.forEach((id) => window.clearTimeout(id));
    };
  }, [leave, releaseToDashboard]);

  return <OnboardingLoadingScreen variant="sparkles" />;
}

export default ProfileWaiter;
