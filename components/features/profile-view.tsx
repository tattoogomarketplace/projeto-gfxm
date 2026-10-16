'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { toast } from '@/lib/toast';
import { useRouter } from 'next/navigation';
import { useClerk, useUser } from '@clerk/nextjs';
import { Images, LogOut, PenTool, Route, ShieldCheck } from 'lucide-react';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { ProfileSkeleton } from '@/components/ui/route-skeletons';
import { ClientIdentityHub } from '@/components/settings/client-identity-hub';
import {
  PublicProfile,
  type ProfileActivity,
  type ProfileHighlight,
  type ProfileMedia,
  type ProfileMetric,
  type ProfileRole,
} from '@/components/features/public-profile';
import { useAgendamentos } from '@/hooks/use-agendamentos';
import { useAuthStore } from '@/hooks/use-auth-store';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useProfileMedia } from '@/hooks/use-profile-media';
import {
  dashboardPathForRole,
  isKycApproved,
  isOnboardingComplete,
  nextRequiredOnboardingStep,
  ONBOARDING_PATH,
  parseAppRole,
  USERNAME_SETUP_PATH,
} from '@/lib/utils/auth-redirect';
import { resolveFullName } from '@/lib/utils/display-name';
import { clearClientSession } from '@/lib/utils/session';
import { useI18n } from '@/hooks/use-i18n';
import { BRAND_NAME, BRAND_PASS } from '@/lib/i18n/brands';
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
  kycStatus: string | null;
};

export function ProfileView() {
  const { isLoaded, isSignedIn, user } = useUser();
  const clerk = useClerk();
  const router = useRouter();
  const { t } = useI18n();
  const { triggerHaptic } = useHapticFeedback();
  const cachedUser = useAuthStore((s) => s.user);
  const cachedRole = useAuthStore((s) => s.role);
  const setUser = useAuthStore((s) => s.setUser);
  const setRole = useAuthStore((s) => s.setRole);
  const { data: agendamentos } = useAgendamentos();

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
  const verified = role === 'tatuador' && isKycApproved(identity?.kycStatus);

  const { data: portfolio } = useProfileMedia(role === 'tatuador');

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
          kycStatus: (payload?.perfil?.kyc_status as string | null) ?? null,
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

  const handleShare = async () => {
    triggerHaptic('light');
    const url =
      typeof window !== 'undefined'
        ? username
          ? `${window.location.origin}/profile/${username}`
          : `${window.location.origin}/dashboard/perfil`
        : '';
    const displayName = nome || cachedUser?.fullName || '';
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ title: BRAND_NAME, text: displayName, url });
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success(t('profile.copied'));
      }
    } catch {
      // Compartilhamento cancelado pelo usuário: nenhum feedback necessário.
    }
  };

  const metrics = useMemo<ProfileMetric[]>(() => {
    const items = Array.isArray(portfolio) ? portfolio : [];
    const likesReceived = items.reduce(
      (total, item) => total + (Number(item?.likesCount) || 0),
      0
    );
    return [
      { key: 'posts', label: t('profile.posts'), value: items.length },
      { key: 'followers', label: t('profile.followers'), value: likesReceived },
      { key: 'following', label: t('profile.following'), value: 0 },
    ];
  }, [portfolio, t]);

  const activity = useMemo<ProfileActivity[]>(() => {
    const list = Array.isArray(agendamentos) ? agendamentos : [];
    const completed = list.reduce(
      (total, item) => total + (item?.status === 'concluido' ? 1 : 0),
      0
    );
    return [
      { key: 'sessions', label: t('profile.sessions'), value: list.length },
      { key: 'completed', label: t('profile.completed'), value: completed },
    ];
  }, [agendamentos, t]);

  const highlights = useMemo<ProfileHighlight[]>(
    () => [
      {
        id: 'atelier',
        label: 'Monte seu ateliê digital',
        href: '/dashboard/seja-tatuador',
        Icon: PenTool,
      },
      {
        id: 'journey',
        label: 'Minha jornada na pele',
        href: `${dashboardPathForRole(role)}?tab=agendar`,
        Icon: Route,
      },
      {
        id: 'inspirations',
        label: t('gallery.title'),
        href: '/dashboard/galeria',
        Icon: Images,
      },
      {
        id: 'pass',
        label: BRAND_PASS,
        href: '/dashboard/pagamentos',
        Icon: ShieldCheck,
      },
    ],
    [role, t]
  );

  const media = useMemo<ProfileMedia>(() => {
    const items = Array.isArray(portfolio) ? portfolio : [];
    return {
      posts: items.map((item) => ({
        id: item.id,
        imageUrl: item.imageUrl,
        alt: item.descricao || item.style || 'Publicação',
      })),
      tagged: [],
      saved: [],
    };
  }, [portfolio]);

  // A barreira de Documentos Pessoais é do servidor; aqui o view é apenas
  // resiliente. Enquanto o Clerk ainda não entregou NENHUMA identidade (nem
  // cache local), mostramos o skeleton de geometria completa. Qualquer outro
  // estado — sessão re-hidratando, papel mudando após o KYC — sempre renderiza
  // o layout base, com valores que degradam para 0 em vez de derrubar a árvore
  // React.
  const hasIdentity = Boolean(cachedUser || user || email || nome);
  if (!isLoaded && !hasIdentity) {
    return <ProfileSkeleton />;
  }

  const displayNome = nome || cachedUser?.fullName || '';
  // O Clerk SEMPRE devolve uma `imageUrl` — quando o usuário não subiu foto, ela
  // aponta para um avatar gerado (silhueta/initials). Só repassamos a imagem
  // quando existe uma foto REAL (`hasImage`), garantindo que o fallback seja
  // sempre o nosso Fine-Line Tattoo e nunca o ícone cinza genérico.
  const hasCustomAvatar = Boolean((user as { hasImage?: boolean } | null)?.hasImage);
  const avatarUrl = hasCustomAvatar ? user?.imageUrl ?? null : null;

  if (role === 'cliente') {
    return (
      <ClientIdentityHub
        name={displayNome}
        username={username}
        email={email}
        avatarUrl={avatarUrl}
        loggingOut={loggingOut}
        onLogout={() => {
          void handleLogout();
        }}
        onAvatarFile={handleAvatarFile}
        onAvatarRemove={handleAvatarRemove}
      />
    );
  }

  return (
    <PublicProfile
      owner
      role={role}
      name={displayNome}
      username={username}
      bio={null}
      verified={verified}
      metrics={metrics}
      activity={activity}
      highlights={highlights}
      media={media}
      onEdit={() => {
        triggerHaptic('light');
        router.push('/dashboard/perfil/configuracoes');
      }}
      onShare={handleShare}
      footer={
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="apple-press flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-orange-500/40 py-3 text-sm font-semibold text-orange-500 transition-transform transition-opacity duration-300 ease-out hover:border-orange-500 hover:bg-orange-500/10 disabled:opacity-50 dark:text-orange-400"
        >
          {loggingOut ? (
            <TattooMachineLoader compact label={t('auth.signOut')} />
          ) : (
            <>
              <LogOut className="h-5 w-5" strokeWidth={1.75} />
              {t('auth.signOut')}
            </>
          )}
        </button>
      }
    />
  );
}
