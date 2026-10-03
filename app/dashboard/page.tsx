'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import {
  dashboardPathForRole,
  isOnboardingComplete,
  LOGIN_PATH,
  ONBOARDING_PATH,
  parseAppRole,
  postSignupPathForRole,
} from '@/lib/utils/auth-redirect';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { useAuthStore } from '@/hooks/use-auth-store';

/** Teto de tentativas antes de oferecer retry manual (evita loader infinito). */
const MAX_ATTEMPTS = 3;

export default function DashboardPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const storedRole = useAuthStore((s) => s.role);
  const redirected = useRef(false);
  const attemptsRef = useRef(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isLoaded || redirected.current) return;

    // Sem sessão Clerk não há o que resolver: manda para o login em vez de
    // manter o loader girando para sempre (o proxy não protege /dashboard).
    if (!isSignedIn || !user) {
      redirected.current = true;
      router.replace(LOGIN_PATH);
      return;
    }

    let cancelled = false;

    const resolveDestination = async () => {
      const metadata = (user.unsafeMetadata || user.publicMetadata || {}) as Record<string, unknown>;
      const metadataRole = parseAppRole((metadata.role as string) || storedRole);

      try {
        const response = await fetch('/api/perfil/ensure', {
          cache: 'no-store',
          credentials: 'include',
        });
        if (cancelled) return;

        // Sessão expirada/inválida no servidor: o correto é reautenticar, não
        // ficar preso no loader.
        if (response.status === 401) {
          redirected.current = true;
          router.replace(LOGIN_PATH);
          return;
        }

        const payload = (await response.json().catch(() => ({}))) as {
          autenticado?: boolean;
          perfil?: { role?: string | null; kyc_status?: string | null; has_seen_welcome_notice?: boolean | null; onboarding_completed?: boolean | null } | null;
          needsOnboarding?: boolean;
        };

        if (payload?.autenticado === false) {
          redirected.current = true;
          router.replace(LOGIN_PATH);
          return;
        }

        if (!payload?.perfil || payload?.needsOnboarding || !isOnboardingComplete(payload.perfil)) {
          redirected.current = true;
          router.replace(ONBOARDING_PATH);
          return;
        }

        const role = parseAppRole(payload.perfil.role) || metadataRole;
        if (!role) {
          redirected.current = true;
          router.replace(ONBOARDING_PATH);
          return;
        }

        redirected.current = true;
        router.replace(
          role === 'tatuador' && payload.perfil.kyc_status !== 'aprovado'
            ? postSignupPathForRole(role)
            : dashboardPathForRole(role)
        );
      } catch {
        if (cancelled || redirected.current) return;

        // Falha de rede transitória: tenta de novo antes de desistir. Sem este
        // teto o usuário ficaria preso no loader indefinidamente.
        attemptsRef.current += 1;
        if (attemptsRef.current < MAX_ATTEMPTS) {
          window.setTimeout(() => {
            if (!cancelled && !redirected.current) void resolveDestination();
          }, 1500);
          return;
        }

        if (metadataRole) {
          redirected.current = true;
          router.replace(dashboardPathForRole(metadataRole));
          return;
        }

        setFailed(true);
      }
    };

    void resolveDestination();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, user, storedRole, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#121212]">
      {failed ? (
        <button
          type="button"
          onClick={() => {
            attemptsRef.current = 0;
            setFailed(false);
            redirected.current = false;
            router.refresh();
          }}
          className="min-h-11 rounded-xl border border-orange-500/40 bg-orange-500/10 px-5 text-sm font-semibold text-orange-400 shadow-[0_0_18px_rgba(249,115,22,0.25)] transition-colors hover:bg-orange-500/20"
        >
          Tentar novamente
        </button>
      ) : (
        <TattooMachineLoader label="Conectando ao seu painel" />
      )}
    </div>
  );
}
