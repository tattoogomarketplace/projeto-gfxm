'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useClerk, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { ChevronRight, LogOut, Settings } from 'lucide-react';
import { AccountManagement } from '@/components/features/account-management';
import { PortfolioUpload } from '@/components/features/portfolio-upload';
import { StudioAffiliationArtist } from '@/components/features/studio-affiliation-artist';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/hooks/use-auth-store';
import { isKycApproved, isOnboardingComplete, ONBOARDING_PATH, parseAppRole } from '@/lib/utils/auth-redirect';
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
  const [kycStatus, setKycStatus] = useState<string | null>(null);
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
        if (typeof payload?.perfil?.kyc_status === 'string') {
          setKycStatus(payload.perfil.kyc_status);
        }
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
  const bio =
    role === 'tatuador'
      ? 'Bancada digital com portfólio, credenciais e agenda no mesmo perfil.'
      : role === 'estudio'
        ? 'Gestão do ateliê, artistas parceiros e métricas em um só lugar.'
        : 'Sua jornada na pele: artistas, referências e sessões com segurança.';
  const kycLabel = isKycApproved(kycStatus) ? 'KYC aprovado' : null;

  return (
    <div className="screen-fade-in flex min-h-full flex-col space-y-5 bg-transparent p-4 pb-6 text-neutral-900 transition-opacity duration-300 ease-in-out sm:p-6 dark:text-white">
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
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-500 dark:text-orange-400">
                {roleLabel}
              </span>
              {kycLabel ? (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-300">
                  {kycLabel}
                </span>
              ) : null}
            </div>
            <h1 className="mt-2 truncate text-[22px] font-semibold tracking-tight text-neutral-900 dark:text-white">
              {nome || roleLabel}
            </h1>
            <p className="mt-1 text-[13px] leading-relaxed text-neutral-600 dark:text-zinc-400">
              {bio}
            </p>
            <p className="mt-1 truncate text-xs text-neutral-500 dark:text-zinc-500">{maskEmail(email)}</p>
          </div>
          <Link
            href="/dashboard/perfil/configuracoes"
            aria-label="Abrir configurações"
            className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl text-zinc-400 transition-all duration-200 hover:bg-orange-500/10 hover:text-orange-500 active:scale-[0.98]"
          >
            <Settings className="h-5 w-5" strokeWidth={1.75} />
          </Link>
        </div>
      </header>

      {role === 'tatuador' ? (
        <section className="space-y-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-500 dark:text-orange-400">
              Portfólio
            </p>
            <h2 className="mt-1 text-[17px] font-semibold tracking-tight text-neutral-900 dark:text-white">
              Peças publicadas
            </h2>
          </div>
          <PortfolioUpload tatuadorId={user.id} />
        </section>
      ) : null}

      {role === 'tatuador' ? <StudioAffiliationArtist /> : null}

      <Link
        href="/dashboard/perfil/configuracoes"
        className="group flex min-h-11 w-full items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-left shadow-sm transition-all hover:border-orange-500/40 hover:bg-orange-500/5 active:scale-[0.99] dark:border-neutral-800 dark:bg-[#121212]"
      >
        <span className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-500 dark:text-orange-400">
          <Settings className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold tracking-tight text-neutral-900 dark:text-white">
            Configurações
          </span>
          <span className="mt-0.5 block text-xs text-neutral-500 dark:text-zinc-500">
            {role === 'tatuador'
              ? 'Tema, expediente, notificações e segurança'
              : 'Tema, notificações e segurança'}
          </span>
        </span>
        <ChevronRight
          className="h-5 w-5 min-h-5 min-w-5 text-zinc-500 transition-colors group-hover:text-orange-400"
          strokeWidth={1.75}
        />
      </Link>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-[#121212] dark:shadow-none">
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
              Sair da conta
            </>
          )}
        </button>
      </section>

      <AccountManagement fallbackRole={role} />
    </div>
  );
}
