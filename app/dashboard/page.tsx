'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import {
  dashboardPathForRole,
  isOnboardingComplete,
  ONBOARDING_PATH,
  parseAppRole,
  postSignupPathForRole,
} from '@/lib/utils/auth-redirect';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { useAuthStore } from '@/hooks/use-auth-store';

export default function DashboardPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const storedRole = useAuthStore((s) => s.role);
  const redirected = useRef(false);

  useEffect(() => {
    if (!isLoaded || redirected.current) return;
    if (!isSignedIn || !user) return;

    let cancelled = false;

    const resolveDestination = async () => {
      const metadata = (user.unsafeMetadata || user.publicMetadata || {}) as Record<string, unknown>;
      const metadataRole = parseAppRole((metadata.role as string) || storedRole);

      try {
        const response = await fetch('/api/perfil/ensure', { cache: 'no-store' });
        if (cancelled) return;

        if (response.status === 401) {
          return;
        }

        const payload = await response.json().catch(() => ({}));
        if (payload?.autenticado === false) {
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
        if (metadataRole) {
          redirected.current = true;
          router.replace(dashboardPathForRole(metadataRole));
          return;
        }
        redirected.current = true;
        router.replace(ONBOARDING_PATH);
      }
    };

    void resolveDestination();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, user, storedRole, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <TattooMachineLoader label="Conectando ao seu painel" />
    </div>
  );
}
