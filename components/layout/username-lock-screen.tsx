'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  destinationAfterProfileSync,
  isOnboardingPath,
  isUsernameGateExemptPath,
} from '@/lib/utils/auth-redirect';
import {
  fetchPerfilEnsure,
  PERFIL_ENSURE_MAX_ATTEMPTS,
  PERFIL_ENSURE_RETRY_DELAY_MS,
} from '@/lib/utils/perfil-bootstrap';

export function UsernameLockScreen() {
  return (
    <div
      data-username-lock
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-[9998] flex h-[100dvh] max-h-[100dvh] min-h-[100dvh] w-full flex-col overflow-hidden overscroll-none bg-[#121212] pointer-events-auto select-none touch-none"
    />
  );
}

export function UsernameLockRedirect() {
  const router = useRouter();
  const redirected = useRef(false);

  useEffect(() => {
    if (redirected.current) return;

    let cancelled = false;
    let attempts = 0;
    const retryTimers: number[] = [];
    const controller = new AbortController();

    const resolve = async () => {
      try {
        const { status, payload } = await fetchPerfilEnsure({ signal: controller.signal });
        if (cancelled || redirected.current) return;
        if (status !== 200 || !payload?.perfil) {
          throw new Error('perfil-pending');
        }

        const destination = destinationAfterProfileSync(
          payload.perfil,
          payload.needsOnboarding
        );
        const currentPath = window.location.pathname;
        if (isOnboardingPath(currentPath) || isUsernameGateExemptPath(currentPath)) {
          return;
        }

        if (destination !== currentPath) {
          redirected.current = true;
          router.replace(destination);
        }
      } catch {
        if (cancelled || redirected.current) return;
        attempts += 1;
        if (attempts < PERFIL_ENSURE_MAX_ATTEMPTS) {
          retryTimers.push(
            window.setTimeout(() => {
              if (!cancelled && !redirected.current) void resolve();
            }, PERFIL_ENSURE_RETRY_DELAY_MS)
          );
        }
      }
    };

    void resolve();
    return () => {
      cancelled = true;
      controller.abort();
      retryTimers.forEach((id) => window.clearTimeout(id));
    };
  }, [router]);

  return <UsernameLockScreen />;
}
