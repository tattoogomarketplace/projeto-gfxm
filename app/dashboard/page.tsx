'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import {
  assignAppPath,
  dashboardPathForRole,
  destinationAfterProfileSync,
  LOGIN_PATH,
  ONBOARDING_PATH,
  parseAppRole,
} from '@/lib/utils/auth-redirect';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { getOnboardingLoadingMessage } from '@/lib/content/role-experience';
import { useAuthStore } from '@/hooks/use-auth-store';
import { isOnboardingGrace } from '@/lib/utils/session';

const MAX_ATTEMPTS = 8;
const FETCH_TIMEOUT_MS = 8000;
const RETRY_DELAY_MS = 800;
const SIGNED_OUT_REDIRECT_MS = 8000;
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

export default function DashboardPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const storedRole = useAuthStore((s) => s.role);
  const redirected = useRef(false);
  const [failed, setFailed] = useState(false);

  const leave = useCallback((path: string) => {
    if (redirected.current) return;
    redirected.current = true;
    assignAppPath(path);
  }, []);

  useEffect(() => {
    if (!isLoaded || redirected.current || failed) return;

    let cancelled = false;
    let attempts = 0;
    const retryTimers: number[] = [];

    const metadata = (user?.unsafeMetadata || user?.publicMetadata || {}) as Record<string, unknown>;
    const metadataRole = parseAppRole((metadata.role as string) || storedRole);

    const fallbackAfterAttempts = () => {
      if (cancelled || redirected.current) return;
      if (isOnboardingGrace()) {
        leave(ONBOARDING_PATH);
        return;
      }
      if (metadataRole) {
        leave(dashboardPathForRole(metadataRole));
        return;
      }
      setFailed(true);
    };

    const resolveDestination = async () => {
      if (cancelled || redirected.current) return;
      const controller = new AbortController();
      const abortTimer = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        const token = await getToken({ skipCache: true });
        if (cancelled || redirected.current) return;
        const response = await fetch('/api/perfil/ensure', {
          cache: 'no-store',
          credentials: 'include',
          signal: controller.signal,
          headers: {
            accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (cancelled) return;

        if (response.status === 401) {
          throw new Error('session-initializing');
        }

        if (!response.ok) {
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
        if (cancelled || redirected.current) return;
        attempts += 1;
        if (attempts < MAX_ATTEMPTS) {
          retryTimers.push(
            window.setTimeout(() => {
              if (!cancelled && !redirected.current) void resolveDestination();
            }, RETRY_DELAY_MS)
          );
          return;
        }
        fallbackAfterAttempts();
      } finally {
        window.clearTimeout(abortTimer);
      }
    };

    if (isSignedIn && user) {
      void resolveDestination();
    }

    const signedOutTimer =
      (!isSignedIn || !user) && !isOnboardingGrace()
        ? window.setTimeout(() => {
            if (cancelled || redirected.current || isOnboardingGrace()) return;
            leave(LOGIN_PATH);
          }, SIGNED_OUT_REDIRECT_MS)
        : undefined;

    const hardTimer = window.setTimeout(() => {
      if (cancelled || redirected.current) return;
      fallbackAfterAttempts();
    }, HARD_TIMEOUT_MS);

    return () => {
      cancelled = true;
      if (signedOutTimer) window.clearTimeout(signedOutTimer);
      window.clearTimeout(hardTimer);
      retryTimers.forEach((id) => window.clearTimeout(id));
    };
  }, [isLoaded, isSignedIn, user, storedRole, getToken, failed, leave]);

  const loadingRole =
    (typeof user?.publicMetadata?.role === 'string' ? user.publicMetadata.role : null) ||
    storedRole;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#121212] px-4">
      {failed ? (
        <button
          type="button"
          onClick={() => {
            redirected.current = false;
            setFailed(false);
          }}
          className="min-h-11 rounded-xl border border-orange-500/40 bg-orange-500/10 px-5 text-sm font-semibold text-orange-400 shadow-[0_0_18px_rgba(249,115,22,0.25)] transition-colors hover:bg-orange-500/20"
        >
          Tentar novamente
        </button>
      ) : (
        <TattooMachineLoader label={getOnboardingLoadingMessage(loadingRole)} />
      )}
    </div>
  );
}
