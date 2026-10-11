'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import { OnboardingUsername } from '@/components/features/onboarding-username';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { authedFetch } from '@/lib/utils/authed-fetch';
import {
  assignAppPath,
  dashboardPathForRole,
  normalizeAppRole,
  type AppRole,
} from '@/lib/utils/auth-redirect';

/**
 * TATTOOGO MK — Rota do onboarding de identidade (@username).
 *
 * Vive sob `/dashboard/onboarding` (portanto "sem casco": sem header, dock ou
 * FAB). É o passo visual imediatamente posterior a:
 *   1) CTA "Minha Jornada na Pele" do fluxo do cliente; e
 *   2) fase de verificação de documentos, no fluxo do artista.
 *
 * Guarda de idempotência (front-end, sem tocar no backend): se o perfil já
 * possui `username`, a trava de 30 dias impede nova troca — então seguimos
 * direto para o painel do papel, evitando que a tela vire um gate permanente.
 */

function UsernameOnboardingLoader() {
  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-[#0a0a0a] px-4">
      <TattooMachineLoader label="Preparando sua identidade..." />
    </div>
  );
}

function UsernameOnboardingInner() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const params = useSearchParams();

  const flow = params.get('flow') === 'tatuador' ? 'tatuador' : 'cliente';
  const [role, setRole] = useState<AppRole | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const metadataRole = normalizeAppRole(
        ((user?.unsafeMetadata || user?.publicMetadata || {}) as Record<string, unknown>).role as
          | string
          | undefined
      );

      try {
        const res = await authedFetch('/api/perfil/ensure', {}, () =>
          getToken({ skipCache: true })
        );
        const payload = (await res.json().catch(() => ({}))) as {
          perfil?: { role?: string | null; username?: string | null } | null;
        };
        if (cancelled) return;

        const perfil = payload?.perfil ?? null;
        const resolvedRole = perfil?.role ? normalizeAppRole(perfil.role) : metadataRole;

        // Já possui handle: a identidade está travada — segue para o painel.
        if (perfil?.username) {
          assignAppPath(dashboardPathForRole(resolvedRole));
          return;
        }

        setRole(resolvedRole);
        setChecking(false);
      } catch {
        if (cancelled) return;
        setRole(metadataRole);
        setChecking(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [getToken, user]);

  if (checking || !role) {
    return <UsernameOnboardingLoader />;
  }

  return (
    <OnboardingUsername
      role={role}
      flow={flow}
      onCompleted={() => assignAppPath(dashboardPathForRole(role))}
    />
  );
}

export default function UsernameOnboardingPage() {
  return (
    <Suspense fallback={<UsernameOnboardingLoader />}>
      <UsernameOnboardingInner />
    </Suspense>
  );
}
