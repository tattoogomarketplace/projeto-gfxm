'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import {
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

const MAX_ATTEMPTS = 3;

export default function DashboardPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const storedRole = useAuthStore((s) => s.role);
  const redirected = useRef(false);
  const attemptsRef = useRef(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isLoaded || redirected.current) return;

    let cancelled = false;

    if (!isSignedIn || !user) {
      return () => {
        cancelled = true;
      };
    }

    const resolveDestination = async () => {
      const metadata = (user.unsafeMetadata || user.publicMetadata || {}) as Record<string, unknown>;
      const metadataRole = parseAppRole((metadata.role as string) || storedRole);

      try {
        const token = await getToken({ skipCache: true });
        const response = await fetch('/api/perfil/ensure', {
          cache: 'no-store',
          credentials: 'include',
          headers: {
            accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (cancelled) return;

        // 401 com o cliente Clerk ainda signed-in = sessão travada/inicializando
        // (task pendente, cookie ainda não ativo). Não redireciona nem lança:
        // trata como falha transitória e tenta de novo.
        if (response.status === 401) {
          throw new Error('session-initializing');
        }

        if (!response.ok) {
          throw new Error('perfil-pending');
        }

        const payload = (await response.json().catch(() => ({}))) as {
          autenticado?: boolean;
          perfil?: { role?: string | null; kyc_status?: string | null; has_seen_welcome_notice?: boolean | null; onboarding_completed?: boolean | null } | null;
          needsOnboarding?: boolean;
        };

        if (payload?.autenticado === false) {
          if (isOnboardingGrace()) {
            throw new Error('session-initializing');
          }
          redirected.current = true;
          router.push(LOGIN_PATH);
          return;
        }

        if (!payload?.perfil) {
          throw new Error('perfil-pending');
        }

        redirected.current = true;
        router.push(
          destinationAfterProfileSync(payload.perfil, payload.needsOnboarding)
        );
      } catch {
        if (cancelled || redirected.current) return;

        // Falha de rede transitória: tenta de novo antes de desistir. Sem este
        // teto o usuário ficaria preso no loader indefinidamente.
        attemptsRef.current += 1;
        if (attemptsRef.current < MAX_ATTEMPTS) {
          window.setTimeout(() => {
            if (!cancelled && !redirected.current) void resolveDestination();
          }, 800);
          return;
        }

        if (isOnboardingGrace()) {
          redirected.current = true;
          router.push(ONBOARDING_PATH);
          return;
        }

        if (metadataRole) {
          redirected.current = true;
          router.push(dashboardPathForRole(metadataRole));
          return;
        }

        setFailed(true);
      }
    };

    void resolveDestination();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, user, storedRole, getToken, router]);

  const loadingRole =
    (typeof user?.publicMetadata?.role === 'string' ? user.publicMetadata.role : null) ||
    storedRole;

  if (!isLoaded || !isSignedIn || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#121212] px-4">
        <TattooMachineLoader label={getOnboardingLoadingMessage(loadingRole)} />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#121212] px-4">
      {failed ? (
        <button
          type="button"
          onClick={() => {
            attemptsRef.current = 0;
            setFailed(false);
            redirected.current = false;
            window.location.reload();
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
