'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import {
  assignAppPath,
  destinationAfterProfileSync,
  LOGIN_PATH,
  parseAppRole,
} from '@/lib/utils/auth-redirect';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { getOnboardingLoadingMessage } from '@/lib/content/role-experience';
import { useAuthStore } from '@/hooks/use-auth-store';
import { isOnboardingGrace } from '@/lib/utils/session';
import {
  fallbackDashboardPath,
  fetchPerfilEnsure,
  PERFIL_ENSURE_FETCH_TIMEOUT_MS,
  PERFIL_ENSURE_HARD_TIMEOUT_MS,
  PERFIL_ENSURE_MAX_ATTEMPTS,
  PERFIL_ENSURE_RETRY_DELAY_MS,
  PERFIL_ENSURE_SIGNED_OUT_MS,
} from '@/lib/utils/perfil-bootstrap';

export default function DashboardPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const storedRole = useAuthStore((s) => s.role);
  const redirected = useRef(false);
  const authRef = useRef({ isLoaded, isSignedIn, getToken });
  const roleRef = useRef<string | null>(null);

  const metadata = (user?.unsafeMetadata || user?.publicMetadata || {}) as Record<string, unknown>;

  useEffect(() => {
    authRef.current = { isLoaded, isSignedIn, getToken };
    roleRef.current = parseAppRole((metadata.role as string) || storedRole);
  }, [isLoaded, isSignedIn, getToken, metadata.role, storedRole]);

  const leave = useCallback((path: string) => {
    if (redirected.current) return;
    redirected.current = true;
    assignAppPath(path);
  }, []);

  const releaseToDashboard = useCallback(() => {
    leave(fallbackDashboardPath(roleRef.current));
  }, [leave]);

  useEffect(() => {
    if (redirected.current) return;

    let cancelled = false;
    let attempts = 0;
    const retryTimers: number[] = [];

    const resolveDestination = async () => {
      if (cancelled || redirected.current) return;
      const controller = new AbortController();
      const abortTimer = window.setTimeout(
        () => controller.abort(),
        PERFIL_ENSURE_FETCH_TIMEOUT_MS
      );
      try {
        const { isLoaded: loaded, getToken: tokenFn } = authRef.current;
        let token: string | null = null;
        if (loaded) {
          token = await Promise.race([
            tokenFn({ skipCache: true }).catch(() => null),
            new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 2500)),
          ]);
        }
        if (cancelled || redirected.current) return;

        const { status, payload } = await fetchPerfilEnsure({
          token,
          signal: controller.signal,
        });
        if (cancelled || redirected.current) return;

        if (status === 401 || payload?.autenticado === false) {
          throw new Error('session-initializing');
        }

        if (status !== 200 || !payload?.perfil) {
          throw new Error('perfil-pending');
        }

        leave(destinationAfterProfileSync(payload.perfil, payload.needsOnboarding));
      } catch {
        if (cancelled || redirected.current) return;
        attempts += 1;
        if (attempts < PERFIL_ENSURE_MAX_ATTEMPTS) {
          retryTimers.push(
            window.setTimeout(() => {
              if (!cancelled && !redirected.current) void resolveDestination();
            }, PERFIL_ENSURE_RETRY_DELAY_MS)
          );
          return;
        }
        const { isLoaded: loaded, isSignedIn: signedIn } = authRef.current;
        if (signedIn || !loaded || isOnboardingGrace()) {
          releaseToDashboard();
          return;
        }
        leave(LOGIN_PATH);
      } finally {
        window.clearTimeout(abortTimer);
      }
    };

    void resolveDestination();

    const signedOutTimer = window.setTimeout(() => {
      if (cancelled || redirected.current || isOnboardingGrace()) return;
      const { isLoaded: loaded, isSignedIn: signedIn } = authRef.current;
      if (!loaded || signedIn) {
        releaseToDashboard();
        return;
      }
      leave(LOGIN_PATH);
    }, PERFIL_ENSURE_SIGNED_OUT_MS);

    const hardTimer = window.setTimeout(() => {
      if (cancelled || redirected.current) return;
      const { isLoaded: loaded, isSignedIn: signedIn } = authRef.current;
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

  const loadingRole =
    (typeof user?.publicMetadata?.role === 'string' ? user.publicMetadata.role : null) ||
    (typeof user?.unsafeMetadata?.role === 'string' ? user.unsafeMetadata.role : null) ||
    storedRole;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#121212] px-4">
      <TattooMachineLoader label={getOnboardingLoadingMessage(loadingRole)} />
    </div>
  );
}
