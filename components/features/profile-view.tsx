'use client';

import { useEffect, useState } from 'react';
import { toast } from '@/lib/toast';
import { useRouter } from 'next/navigation';
import { useClerk, useUser } from '@clerk/nextjs';
import { LogOut } from 'lucide-react';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/hooks/use-auth-store';
import { isOnboardingComplete, ONBOARDING_PATH, parseAppRole } from '@/lib/utils/auth-redirect';
import { resolveFullName } from '@/lib/utils/display-name';
import { maskEmail } from '@/lib/utils/security';
import { clearClientSession } from '@/lib/utils/session';
import { useI18n } from '@/hooks/use-i18n';

export function ProfileView() {
  const { isLoaded, isSignedIn, user } = useUser();
  const clerk = useClerk();
  const router = useRouter();
  const { t } = useI18n();
  const cachedUser = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const setRole = useAuthStore((s) => s.setRole);

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
    <div className="gpu-layer flex h-full min-h-0 w-full flex-col overflow-y-auto overscroll-none bg-transparent pb-[max(10rem,env(safe-area-inset-bottom))] pt-5 text-neutral-900 contain-paint transform-gpu backface-hidden will-change-transform transition-transform transition-opacity duration-300 ease-out dark:text-white">
      <header className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm contain-paint transform-gpu backface-hidden will-change-transform dark:border-neutral-800 dark:bg-[#121212] dark:shadow-none">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-16 hidden h-44 w-44 rounded-full bg-orange-500/18 blur-2xl md:block"
        />
        <div className="relative flex items-start gap-4">
          <span className="flex h-16 w-16 min-h-16 min-w-16 items-center justify-center rounded-full border border-orange-500/40 bg-white text-2xl font-semibold uppercase text-orange-500 shadow-[0_0_18px_rgba(249,115,22,0.28)] dark:bg-[#1a1a1a] dark:text-orange-400">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[22px] font-semibold tracking-tight text-neutral-900 dark:text-white">
              {displayNome || t('profile.title')}
            </h1>
            <p className="mt-1 truncate text-sm text-neutral-500 dark:text-zinc-400">{maskEmail(displayEmail)}</p>
          </div>
        </div>
      </header>

      <div className="mt-auto pt-8">
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-orange-500/40 py-3 text-sm font-semibold text-orange-500 transform-gpu backface-hidden transition-transform transition-opacity duration-300 ease-out hover:border-orange-500 hover:bg-orange-500/10 active:scale-[0.98] disabled:opacity-50 dark:text-orange-400"
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
