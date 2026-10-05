'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useClerk, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { ChevronRight, FileText, Palette, Settings } from 'lucide-react';
import { Input } from '@/components/input';
import { AccountManagement } from '@/components/features/account-management';
import { PasswordChangeForm } from '@/components/features/password-change-form';
import { StudioAffiliationArtist } from '@/components/features/studio-affiliation-artist';
import { TermsViewerModal } from '@/components/shared/terms-viewer-modal';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { TERMS_VERSION } from '@/lib/terms';
import { useAuthStore } from '@/hooks/use-auth-store';
import { isOnboardingComplete, ONBOARDING_PATH, parseAppRole } from '@/lib/utils/auth-redirect';
import { resolveFullName } from '@/lib/utils/display-name';
import { maskEmail } from '@/lib/utils/security';
import { clearClientSession } from '@/lib/utils/session';

export default function PerfilPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const clerk = useClerk();
  const setUser = useAuthStore((s) => s.setUser);
  const setRole = useAuthStore((s) => s.setRole);
  const role = useAuthStore((s) => s.role);

  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

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
          window.location.href = ONBOARDING_PATH;
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
  }, [isLoaded, isSignedIn, user, setUser, setRole]);

  const handleSaveName = async () => {
    const nextName = nome.trim();
    if (nextName.length < 2) {
      toast.error('Informe seu nome real.');
      return;
    }

    setSaving(true);
    try {
      if (!user) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }
      const parts = nextName.split(/\s+/);
      await user.update({
        firstName: parts[0],
        lastName: parts.slice(1).join(' ') || undefined,
      });
      await user.updateMetadata({
        unsafeMetadata: {
          full_name: nextName,
          nome: nextName,
        },
      });
      setUser({
        id: user?.id ?? '',
        email: user?.primaryEmailAddress?.emailAddress ?? email,
        fullName: nextName,
      });
      toast.success('Nome atualizado com sucesso.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao atualizar o nome.');
    } finally {
      setSaving(false);
    }
  };

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
      <div className="flex min-h-full items-center justify-center p-10">
        <TattooMachineLoader label="Abrindo seu perfil" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col dark:bg-black bg-neutral-50 space-y-6 p-4 text-neutral-900 sm:p-6 dark:text-white">
      <header className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm backdrop-blur-md transition-colors hover:border-orange-500/40 dark:border-neutral-800 dark:bg-[#121212] dark:shadow-none">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-orange-500/20 blur-3xl"
        />
        <div className="relative flex items-center gap-3">
          <span className="flex h-12 w-12 min-h-12 min-w-12 items-center justify-center rounded-full border border-orange-500/40 bg-white text-lg font-bold uppercase text-orange-500 shadow-[0_0_18px_rgba(249,115,22,0.3)] dark:bg-[#1a1a1a] dark:text-orange-400">
            {(nome || email || 'A').trim().charAt(0)?.toUpperCase() || 'A'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-400">
              Meu Perfil
            </p>
            <h1 className="mt-0.5 truncate bg-gradient-to-r from-neutral-900 via-orange-700 to-orange-500 bg-clip-text text-2xl font-bold tracking-tight text-transparent dark:from-white dark:via-orange-100 dark:to-orange-400">
              {nome || 'Artista'}
            </h1>
            <p className="mt-1 truncate text-sm text-zinc-400">{maskEmail(email)}</p>
          </div>
        </div>
      </header>

      <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-all hover:border-orange-500/40 dark:border-neutral-800 dark:bg-[#121212] dark:shadow-none">
        <h2 className="text-lg font-bold text-orange-500 dark:text-orange-400">Editar nome</h2>
        <Input
          label="Nome real"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="border-neutral-200 bg-white text-neutral-900 focus:ring-orange-500 dark:border-neutral-800 dark:bg-[#121212] dark:text-white"
        />
        <button
          type="button"
          onClick={handleSaveName}
          disabled={saving}
          className="min-h-11 w-full rounded-xl bg-orange-500 py-3 font-bold text-black shadow-[0_0_18px_rgba(249,115,22,0.3)] transition-all hover:bg-orange-600 active:scale-95 disabled:opacity-50"
        >
          {saving ? <TattooMachineLoader compact label="Salvando" /> : 'Salvar nome'}
        </button>
      </section>

      <PasswordChangeForm />

      {role === 'tatuador' ? <StudioAffiliationArtist /> : null}

      <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-all hover:border-orange-500/40 dark:border-neutral-800 dark:bg-[#121212] dark:shadow-none">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-500 shadow-[0_0_18px_rgba(249,115,22,0.22)] dark:text-orange-400">
            <Settings className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="bg-gradient-to-r from-neutral-900 via-orange-700 to-orange-500 bg-clip-text text-lg font-bold tracking-tight text-transparent dark:from-white dark:via-orange-100 dark:to-orange-400">
              Configurações
            </h2>
            <p className="mt-0.5 text-xs text-zinc-400">
              Preferências, aparência e documentos legais da sua conta.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/perfil/configuracoes"
          className="group flex min-h-11 w-full items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-left transition-all hover:border-orange-500/40 hover:bg-orange-500/5 active:scale-[0.99] dark:border-white/10 dark:bg-white/5"
        >
          <Palette className="h-5 w-5 min-h-5 min-w-5 text-orange-500 dark:text-orange-400" strokeWidth={1.75} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-neutral-900 dark:text-white">
              Aparência e tema
            </span>
            <span className="mt-0.5 block text-xs text-zinc-500">
              Escuro, claro ou padrão do sistema
            </span>
          </span>
          <ChevronRight
            className="h-4 w-4 min-h-4 min-w-4 text-zinc-500 transition-colors group-hover:text-orange-400"
            strokeWidth={1.75}
          />
        </Link>
        <button
          type="button"
          onClick={() => setShowTerms(true)}
          className="group flex min-h-11 w-full items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-left transition-all hover:border-orange-500/40 hover:bg-orange-500/5 active:scale-[0.99] dark:border-white/10 dark:bg-white/5"
        >
          <FileText className="h-5 w-5 min-h-5 min-w-5 text-orange-500 dark:text-orange-400" strokeWidth={1.75} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-neutral-900 dark:text-white">
              Termos de Uso e Política de Privacidade
            </span>
            <span className="mt-0.5 block text-xs text-zinc-500">Versão {TERMS_VERSION}</span>
          </span>
          <ChevronRight
            className="h-4 w-4 min-h-4 min-w-4 text-zinc-500 transition-colors group-hover:text-orange-400"
            strokeWidth={1.75}
          />
        </button>
      </section>

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

      <TermsViewerModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
    </div>
  );
}
