'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from '@/lib/toast';
import { useRouter } from 'next/navigation';
import { useClerk, useUser } from '@clerk/nextjs';
import { BadgeCheck, CalendarCheck, Heart, LogOut, Sparkles } from 'lucide-react';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { Skeleton } from '@/components/ui/skeleton';
import { useAgendamentos } from '@/hooks/use-agendamentos';
import { useAuthStore } from '@/hooks/use-auth-store';
import { isOnboardingComplete, ONBOARDING_PATH, parseAppRole } from '@/lib/utils/auth-redirect';
import { resolveFullName } from '@/lib/utils/display-name';
import { maskEmail } from '@/lib/utils/security';
import { clearClientSession } from '@/lib/utils/session';
import { useI18n } from '@/hooks/use-i18n';
import { BRAND_NAME } from '@/lib/i18n/brands';
import type { MessageKey } from '@/lib/i18n/types';

export function ProfileView() {
  const { isLoaded, isSignedIn, user } = useUser();
  const clerk = useClerk();
  const router = useRouter();
  const { t } = useI18n();
  const cachedUser = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const setRole = useAuthStore((s) => s.setRole);
  const { data: agendamentos } = useAgendamentos();

  const clerkEmail = user?.primaryEmailAddress?.emailAddress ?? '';
  const clerkNome = user
    ? resolveFullName(
        {
          full_name: (user.unsafeMetadata as Record<string, unknown> | undefined)?.full_name as
            | string
            | undefined,
          nome: (user.unsafeMetadata as Record<string, unknown> | undefined)?.nome as string | undefined,
          name: user.fullName || undefined,
        },
        user.fullName || ''
      )
    : '';

  const [email, setEmail] = useState(cachedUser?.email || clerkEmail);
  const [nome, setNome] = useState(cachedUser?.fullName || clerkNome);
  const [hydrated, setHydrated] = useState(Boolean(cachedUser || user));
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    router.prefetch('/dashboard/perfil/configuracoes');
  }, [router]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !user) return;

    let cancelled = false;

    const hydrate = async () => {
      const metadata = (user.unsafeMetadata || user.publicMetadata || {}) as Record<string, unknown>;
      const fullName = resolveFullName(
        {
          full_name: metadata?.full_name as string | undefined,
          nome: metadata?.nome as string | undefined,
          name: user.fullName || undefined,
        },
        user.fullName || ''
      );
      const emailAddress = user.primaryEmailAddress?.emailAddress ?? '';
      if (!cancelled) {
        setEmail(emailAddress);
        setNome(fullName);
        setUser({
          id: user.id,
          email: emailAddress,
          fullName,
        });
        setHydrated(true);
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
        const parsedRole = parseAppRole(payload?.perfil?.role);
        if (parsedRole) setRole(parsedRole);
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
      toast.error(err instanceof Error ? err.message : 'Falha ao sair da conta.');
      setLoggingOut(false);
    }
  };

  const stats = useMemo(() => {
    const list = agendamentos ?? [];
    const completed = list.filter((item) => item?.status === 'concluido').length;
    return [
      { key: 'profile.sessions' as MessageKey, value: list.length, Icon: CalendarCheck },
      { key: 'profile.completed' as MessageKey, value: completed, Icon: Sparkles },
      { key: 'profile.favorites' as MessageKey, value: 0, Icon: Heart },
    ];
  }, [agendamentos]);

  if (!hydrated && (!isLoaded || !isSignedIn || !user)) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto overscroll-none bg-transparent pb-[max(10rem,env(safe-area-inset-bottom))] pt-5 [-webkit-overflow-scrolling:touch] transform-gpu backface-hidden will-change-transform transition-transform transition-opacity duration-300 ease-out">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-14 w-full rounded-2xl" />
      </div>
    );
  }

  const displayEmail = email || cachedUser?.email || '';
  const displayNome = nome || cachedUser?.fullName || '';
  const initials = (displayNome || displayEmail || 'A').trim().charAt(0)?.toUpperCase() || 'A';

  return (
    <div className="gpu-layer flex h-full min-h-0 w-full flex-1 flex-col overflow-y-auto overscroll-none bg-transparent pb-[max(10rem,env(safe-area-inset-bottom))] pt-5 text-gray-900 contain-paint transform-gpu backface-hidden will-change-transform transition-transform transition-opacity duration-300 ease-out dark:text-white">
      <header className="relative w-full overflow-hidden rounded-3xl border border-black/[0.04] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] contain-paint transform-gpu backface-hidden will-change-transform dark:border-white/[0.05] dark:bg-white/[0.03] dark:shadow-none">
        <div className="relative h-28 w-full overflow-hidden border-b border-black/[0.04] bg-neutral-100 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-b from-transparent to-black/[0.03] dark:to-white/[0.02]"
          />
          <p className="absolute left-5 top-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500 dark:text-zinc-400">
            {BRAND_NAME}
          </p>
        </div>

        <div className="relative px-5 pb-5">
          <div className="flex items-end gap-4">
            <span className="-mt-12 flex h-20 w-20 min-h-20 min-w-20 items-center justify-center rounded-3xl border-4 border-white bg-neutral-900 text-2xl font-semibold uppercase text-orange-400 shadow-[0_8px_24px_rgba(0,0,0,0.18)] dark:border-[#0a0a0a]">
              {initials}
            </span>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-[22px] font-semibold tracking-tight text-gray-900 dark:text-white">
                  {displayNome || t('profile.title')}
                </h1>
                <BadgeCheck className="h-5 w-5 min-h-5 min-w-5 shrink-0 text-emerald-500" strokeWidth={2} />
              </div>
              <p className="mt-1 truncate text-sm text-neutral-500 dark:text-zinc-400">
                {maskEmail(displayEmail)}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {stats.map(({ key, value, Icon }) => (
          <div
            key={key}
            className="w-full rounded-2xl border border-black/[0.04] bg-white px-2 py-4 text-center dark:border-white/[0.05] dark:bg-white/[0.03]"
          >
            <span className="mx-auto flex h-9 w-9 min-h-9 min-w-9 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-500 dark:text-orange-400">
              <Icon className="h-4 w-4" strokeWidth={1.9} />
            </span>
            <p className="mt-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              {value}
            </p>
            <p className="mt-0.5 truncate text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-zinc-400">
              {t(key)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-8">
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="apple-press flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-orange-500/40 py-3 text-sm font-semibold text-orange-500 transition-transform transition-opacity duration-300 ease-out hover:border-orange-500 hover:bg-orange-500/10 disabled:opacity-50 dark:text-orange-400"
        >
          {loggingOut ? (
            <TattooMachineLoader compact label="Saindo" />
          ) : (
            <>
              <LogOut className="h-5 w-5" strokeWidth={1.75} />
              {t('auth.signOut')}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
