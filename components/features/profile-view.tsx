'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from '@/lib/toast';
import { useRouter } from 'next/navigation';
import { useClerk, useUser } from '@clerk/nextjs';
import { Images, LogOut, PenTool, Route, ShieldCheck } from 'lucide-react';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { Skeleton } from '@/components/ui/skeleton';
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
 * Skeleton de geometria idêntica ao layout real (header + destaques + grade em
 * abas + "Sair da Conta"). Evita salto de layout (CLS) e, principalmente,
 * impede que a transição de re-hidratação deixe a área de conteúdo em branco.
 */
function ProfileSkeleton() {
  return (
    <div className="gpu-layer flex h-full min-h-0 w-full flex-1 flex-col overflow-y-auto overscroll-none bg-transparent pb-[max(10rem,env(safe-area-inset-bottom))] pt-5 text-gray-900 contain-paint transform-gpu backface-hidden will-change-transform transition-transform transition-opacity duration-300 ease-out dark:text-white">
      <header className="relative w-full overflow-hidden rounded-3xl border border-black/[0.04] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] contain-paint dark:border-white/[0.05] dark:bg-white/[0.03] dark:shadow-none">
        <Skeleton className="h-32 w-full rounded-none" />
        <div className="relative px-5 pb-5">
          <div className="flex items-end gap-4">
            <Skeleton className="-mt-12 h-20 w-20 min-h-20 min-w-20 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2 pb-1">
              <Skeleton className="h-6 w-40 rounded-md" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[0, 1, 2].map((index) => (
              <div key={index} className="flex flex-col items-center gap-1.5">
                <Skeleton className="h-6 w-12 rounded-md" />
                <Skeleton className="h-3 w-16 rounded-md" />
              </div>
            ))}
          </div>
          <Skeleton className="mt-4 h-4 w-full rounded-md" />
          <Skeleton className="mt-2 h-4 w-2/3 rounded-md" />
          <Skeleton className="mt-4 h-11 w-full rounded-xl" />
        </div>
      </header>

      <div className="mt-5 flex gap-3 px-1">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="flex w-[76px] shrink-0 flex-col items-center gap-2">
            <Skeleton className="h-[68px] w-[68px] rounded-full" />
            <Skeleton className="h-3 w-14 rounded-md" />
          </div>
        ))}
      </div>

      <div className="mt-6">
        <Skeleton className="h-12 w-full rounded-2xl" />
        <div className="mt-4 grid grid-cols-3 gap-[3px] sm:gap-1">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <Skeleton key={index} className="aspect-square w-full rounded-[10px]" />
          ))}
        </div>
      </div>

      <div className="mt-auto pt-8">
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
    </div>
  );
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
