'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from '@/lib/toast';
import { useRouter } from 'next/navigation';
import { useClerk, useUser } from '@clerk/nextjs';
import { InstagramSpinnerOverlay } from '@/components/ui/instagram-spinner';
import { ClientIdentityHub } from '@/components/settings/client-identity-hub';
import { type ProfileRole } from '@/components/features/public-profile';
import { useAuthStore } from '@/hooks/use-auth-store';
import {
  isOnboardingComplete,
  nextRequiredOnboardingStep,
  ONBOARDING_PATH,
  parseAppRole,
  USERNAME_SETUP_PATH,
} from '@/lib/utils/auth-redirect';
import { resolveFullName } from '@/lib/utils/display-name';
import { clearClientSession } from '@/lib/utils/session';
import { formatAppError } from '@/lib/error-handler';

/**
 * Identifica falhas idempotentes de remoção de avatar no Clerk ("resource not
 * found" / HTTP 404). Nesses casos a foto já não existe: tratamos como sucesso.
 */
function isProfileImageMissingError(err: unknown): boolean {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : '';
  return /not[_\s-]?found|resource[_\s-]?not|404|não encontrado/i.test(message);
}

type PerfilIdentity = {
  role: ProfileRole;
  username: string | null;
};

export function ProfileView() {
  const { isLoaded, isSignedIn, user } = useUser();
  const clerk = useClerk();
  const router = useRouter();
  const cachedUser = useAuthStore((s) => s.user);
  const cachedRole = useAuthStore((s) => s.role);
  const setUser = useAuthStore((s) => s.setUser);
  const setRole = useAuthStore((s) => s.setRole);

  const clerkEmail = user?.primaryEmailAddress?.emailAddress ?? '';
  const clerkNome = user
    ? resolveFullName(
        {
          full_name: (user?.unsafeMetadata as Record<string, unknown> | undefined)?.full_name as
            | string
            | undefined,
          nome: (user?.unsafeMetadata as Record<string, unknown> | undefined)?.nome as string | undefined,
          name: user?.fullName || undefined,
        },
        user?.fullName || ''
      )
    : '';

  const [email, setEmail] = useState(cachedUser?.email || clerkEmail);
  const [nome, setNome] = useState(cachedUser?.fullName || clerkNome);
  const [identity, setIdentity] = useState<PerfilIdentity | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const role: ProfileRole = identity?.role ?? cachedRole ?? 'cliente';
  const username = identity?.username ?? null;

  useEffect(() => {
    router.prefetch('/dashboard/perfil/configuracoes');
  }, [router]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !user) return;

    let cancelled = false;

    const hydrate = async () => {
      const metadata = (user?.unsafeMetadata ?? user?.publicMetadata ?? {}) as Record<string, unknown>;
      const fullName = resolveFullName(
        {
          full_name: metadata?.full_name as string | undefined,
          nome: metadata?.nome as string | undefined,
          name: user?.fullName || undefined,
        },
        user?.fullName || ''
      );
      const emailAddress = user?.primaryEmailAddress?.emailAddress ?? '';
      if (!cancelled) {
        setEmail(emailAddress);
        setNome(fullName);
        setUser({
          id: user.id,
          email: emailAddress,
          fullName,
        });
      }

      try {
        const response = await fetch('/api/perfil/ensure', { cache: 'no-store' });
        if (cancelled) return;
        if (response.status === 401) {
          throw new Error('session-initializing');
        }
        const payload = await response.json().catch(() => ({}));
        if (!payload?.perfil || payload?.needsOnboarding || !isOnboardingComplete(payload.perfil)) {
          router.push(ONBOARDING_PATH);
          return;
        }
        // Gatekeeper persistente do @username: espelha o guardião do servidor,
        // cobrindo a navegação cliente para o perfil sem piscar conteúdo.
        if (nextRequiredOnboardingStep(payload.perfil) === USERNAME_SETUP_PATH) {
          router.push(USERNAME_SETUP_PATH);
          return;
        }
        const parsedRole = parseAppRole(payload?.perfil?.role);
        if (parsedRole) setRole(parsedRole);
        setIdentity({
          role: parsedRole ?? 'cliente',
          username: (payload?.perfil?.username as string | null) ?? null,
        });
      } catch {
        if (cancelled) return;
      }
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, user, setUser, setRole, router]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      clearClientSession({ intentional: true });
      await clerk.signOut({ redirectUrl: '/login' });
    } catch (err) {
      toast.error(formatAppError(err, 'api'));
      setLoggingOut(false);
    }
  };

  const handleAvatarFile = useCallback(
    async (file: File) => {
      if (!user) return;
      try {
        await user.setProfileImage({ file });
      } catch (err) {
        toast.error(formatAppError(err, 'api'));
      }
    },
    [user]
  );

  const handleAvatarRemove = useCallback(async () => {
    if (!user) return;
    try {
      await user.setProfileImage({ file: null });
    } catch (err) {
      // O Clerk pode lançar "Recurso não encontrado" quando o avatar já não
      // existe (ex.: duplo toque ou estado já limpo). Isso é um sucesso
      // idempotente — nunca deve quebrar a UI nem reexibir o fallback genérico.
      if (!isProfileImageMissingError(err)) throw err;
    }
  }, [user]);

  const hasIdentity = Boolean(cachedUser || user || email || nome);
  const awaitingIdentity = !isLoaded && !hasIdentity;
  const displayNome = nome || cachedUser?.fullName || '';
  const hasCustomAvatar = Boolean((user as { hasImage?: boolean } | null)?.hasImage);
  const avatarUrl = hasCustomAvatar ? user?.imageUrl ?? null : null;
  const publicProfileHref = username ? `/profile/${username}` : null;

  return (
    <div className="relative h-full min-h-0 w-full">
      <ClientIdentityHub
        name={displayNome}
        username={username}
        email={email}
        avatarUrl={avatarUrl}
        loggingOut={loggingOut}
        publicProfileHref={role === 'tatuador' ? publicProfileHref : null}
        onLogout={() => {
          void handleLogout();
        }}
        onAvatarFile={handleAvatarFile}
        onAvatarRemove={handleAvatarRemove}
      />
      {awaitingIdentity ? <InstagramSpinnerOverlay /> : null}
    </div>
  );
}
