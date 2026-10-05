'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useClerk, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { ChevronRight, Settings } from 'lucide-react';
import { AccountManagement } from '@/components/features/account-management';
import { PortfolioUpload } from '@/components/features/portfolio-upload';
import { StudioAffiliationArtist } from '@/components/features/studio-affiliation-artist';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/hooks/use-auth-store';
import { isOnboardingComplete, ONBOARDING_PATH, parseAppRole } from '@/lib/utils/auth-redirect';
import { ROLE_EXPERIENCE } from '@/lib/content/role-experience';
import { resolveFullName } from '@/lib/utils/display-name';
import { maskEmail } from '@/lib/utils/security';
import { clearClientSession } from '@/lib/utils/session';

export default function PerfilPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const clerk = useClerk();
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const setRole = useAuthStore((s) => s.setRole);
  const role = useAuthStore((s) => s.role);

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
      <div className="screen-fade-in min-h-full space-y-4 bg-transparent p-4 pb-6 transition-opacity duration-300 ease-in-out sm:p-6">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  const roleLabel = role ? ROLE_EXPERIENCE[role].label : 'Conta';
  const initials = (nome || email || 'A').trim().charAt(0)?.toUpperCase() || 'A';

  return (
    <div className="screen-fade-in flex min-h-full flex-col space-y-6 bg-transparent p-4 pb-6 text-neutral-900 transition-opacity duration-300 ease-in-out sm:p-6 dark:text-white">
      <header className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm backdrop-blur-md dark:border-neutral-800 dark:bg-[#121212] dark:shadow-none">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-orange-500/20 blur-3xl"
        />
        <div className="relative flex items-center gap-3">
          <span className="flex h-14 w-14 min-h-14 min-w-14 items-center justify-center rounded-full border border-orange-500/40 bg-white text-xl font-bold uppercase text-orange-500 shadow-[0_0_18px_rgba(249,115,22,0.3)] dark:bg-[#1a1a1a] dark:text-orange-400">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-400">
              {roleLabel}
            </p>
            <h1 className="mt-0.5 truncate bg-gradient-to-r from-neutral-900 via-orange-700 to-orange-500 bg-clip-text text-2xl font-bold tracking-tight text-transparent dark:from-white dark:via-orange-100 dark:to-orange-400">
              {nome || roleLabel}
            </h1>
            <p className="mt-1 truncate text-sm text-zinc-400">{maskEmail(email)}</p>
          </div>
          <Link
            href="/dashboard/perfil/configuracoes"
            aria-label="Abrir configurações"
            className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl text-zinc-400 transition-all duration-200 hover:bg-[#FF5722]/10 hover:text-[#FF5722] active:scale-[0.98]"
          >
            <Settings className="h-5 w-5" strokeWidth={1.75} />
          </Link>
        </div>
      </header>

      {role === 'tatuador' ? <PortfolioUpload tatuadorId={user.id} /> : null}

      {role === 'tatuador' ? <StudioAffiliationArtist /> : null}

      <Link
        href="/dashboard/perfil/configuracoes"
        className="group flex min-h-11 w-full items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left shadow-sm transition-all hover:border-orange-500/40 hover:bg-orange-500/5 active:scale-[0.99] dark:border-neutral-800 dark:bg-[#121212]"
      >
        <span className="flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-500 shadow-[0_0_18px_rgba(249,115,22,0.22)] dark:text-orange-400">
          <Settings className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-neutral-900 dark:text-white">Configurações</span>
          <span className="mt-0.5 block text-xs text-zinc-500">
            {role === 'tatuador'
              ? 'Tema, expediente, notificações e segurança'
              : 'Tema, notificações e segurança'}
          </span>
        </span>
        <ChevronRight
          className="h-4 w-4 min-h-4 min-w-4 text-zinc-500 transition-colors group-hover:text-orange-400"
          strokeWidth={1.75}
        />
      </Link>

      <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-all hover:border-orange-500/40 dark:border-neutral-800 dark:bg-[#121212] dark:shadow-none">
        <h2 className="text-lg font-bold text-orange-500 dark:text-orange-400">Sessão</h2>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="min-h-11 w-full rounded-xl border border-orange-500/50 py-3 font-bold text-orange-400 transition-all hover:border-orange-500 hover:bg-orange-500/10 active:scale-95 disabled:opacity-50"
        >
          {loggingOut ? <TattooMachineLoader compact label="Saindo" /> : 'Sair da Conta'}
        </button>
      </section>

      <AccountManagement fallbackRole={role} />
    </div>
  );
}
