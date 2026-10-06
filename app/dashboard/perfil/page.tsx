'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useClerk, useUser } from '@clerk/nextjs';
import { LogOut } from 'lucide-react';
import { ProfileSettingsDrawer } from '@/components/features/profile-settings-drawer';
import { TattooMachineMenuTrigger } from '@/components/ui/tattoo-machine-menu-icon';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/hooks/use-auth-store';
import { useUiStore } from '@/hooks/use-ui-store';
import { isOnboardingComplete, ONBOARDING_PATH, parseAppRole } from '@/lib/utils/auth-redirect';
import { resolveFullName } from '@/lib/utils/display-name';
import { maskEmail } from '@/lib/utils/security';
import { clearClientSession } from '@/lib/utils/session';

export default function PerfilPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const clerk = useClerk();
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const setRole = useAuthStore((s) => s.setRole);
  const settingsDrawerOpen = useUiStore((s) => s.settingsDrawerOpen);
  const openSettingsDrawer = useUiStore((s) => s.openSettingsDrawer);

  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !user) return;

    let cancelled = false;

    const hydrate = async () => {
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
      if (cancelled) return;
      setEmail(emailAddress);
      setNome(fullName);
      setUser({
        id: user.id,
        email: emailAddress,
        fullName,
      });
      setLoading(false);
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

  if (loading || !isLoaded || !isSignedIn || !user) {
    return (
      <div className="screen-fade-in space-y-4 bg-transparent pt-5 transition-opacity duration-300 ease-in-out">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-14 w-full rounded-2xl" />
      </div>
    );
  }

  const initials = (nome || email || 'A').trim().charAt(0)?.toUpperCase() || 'A';

  return (
    <div className="screen-fade-in flex flex-col bg-transparent pt-5 text-neutral-900 transition-opacity duration-300 ease-in-out dark:text-white">
      <header className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-[#121212] dark:shadow-none">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-orange-500/18 blur-3xl"
        />
        <div className="relative flex items-start gap-4">
          <span className="flex h-16 w-16 min-h-16 min-w-16 items-center justify-center rounded-full border border-orange-500/40 bg-white text-2xl font-semibold uppercase text-orange-500 shadow-[0_0_18px_rgba(249,115,22,0.28)] dark:bg-[#1a1a1a] dark:text-orange-400">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[22px] font-semibold tracking-tight text-neutral-900 dark:text-white">
              {nome || 'Perfil'}
            </h1>
            <p className="mt-1 truncate text-sm text-neutral-500 dark:text-zinc-400">{maskEmail(email)}</p>
          </div>
          <TattooMachineMenuTrigger open={settingsDrawerOpen} onClick={openSettingsDrawer} />
        </div>
      </header>

      <div className="mt-auto pt-8">
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-orange-500/40 py-3 text-sm font-semibold text-orange-500 transition-all hover:border-orange-500 hover:bg-orange-500/10 active:scale-[0.98] disabled:opacity-50 dark:text-orange-400"
        >
          {loggingOut ? (
            <TattooMachineLoader compact label="Saindo" />
          ) : (
            <>
              <LogOut className="h-5 w-5" strokeWidth={1.75} />
              Sair da Conta
            </>
          )}
        </button>
      </div>

      <ProfileSettingsDrawer />
    </div>
  );
}
