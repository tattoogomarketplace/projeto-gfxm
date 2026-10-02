'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';
import { RoleSelector, type RegisterRole } from '@/components/features/role-selector';
import { getWelcomeContent } from '@/components/features/welcome-gate';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { useAuthStore } from '@/hooks/use-auth-store';
import {
  dashboardPathForRole,
  parseAppRole,
  postSignupPathForRole,
  type AppRole,
} from '@/lib/utils/auth-redirect';

/**
 * Destino do papel após concluir o onboarding. Tatuadores ainda sem KYC
 * aprovado vão para o fluxo de documentos; clientes e estúdios entram direto
 * no painel canônico.
 */
function destinationForRole(role: AppRole, kycStatus?: string | null): string {
  if (role === 'tatuador' && kycStatus !== 'aprovado') {
    return postSignupPathForRole(role);
  }
  return dashboardPathForRole(role);
}

export default function DashboardOnboardingPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const setUser = useAuthStore((s) => s.setUser);
  const setRole = useAuthStore((s) => s.setRole);
  const [role, setLocalRole] = useState<RegisterRole>('cliente');
  const [lockedRole, setLockedRole] = useState<RegisterRole | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;

    let cancelled = false;

    const bootstrap = async () => {
      if (!isSignedIn || !user) {
        router.replace('/login');
        setChecking(false);
        return;
      }

      const metadata = (user.unsafeMetadata || user.publicMetadata || {}) as Record<string, unknown>;
      const metadataRole = parseAppRole(metadata.role as string);
      if (metadataRole && !cancelled) {
        setLockedRole(metadataRole);
        setLocalRole(metadataRole);
      }

      try {
        if (!isLoaded || !isSignedIn || !user) {
          return;
        }
        const response = await fetch('/api/perfil/ensure', { cache: 'no-store' });
        if (cancelled) return;
        if (response.status === 401) {
          router.replace('/login');
          return;
        }
        const payload = await response.json().catch(() => ({}));
        const existingRole = parseAppRole(payload?.perfil?.role);
        const existingName = (payload?.perfil?.nome as string | undefined) ?? null;

        if (existingName && !cancelled) {
          setProfileName(existingName);
        }
        if (existingRole && !cancelled) {
          setLockedRole(existingRole);
          setRole(existingRole);
        }

        // Só sai do onboarding quando o banco confirma a conclusão. Ter um
        // papel salvo não basta: o guard do layout devolveria o usuário para cá
        // e criaria o loop. O flag é a única fonte de verdade.
        if (existingRole && payload?.perfil?.onboarding_completed === true && !cancelled) {
          router.refresh();
          router.replace(destinationForRole(existingRole, payload?.perfil?.kyc_status));
          return;
        }
      } catch {
        toast.error('Não foi possível carregar seu perfil. Tente novamente.');
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, user, router, setRole]);

  const handleAdvance = async () => {
    if (submitting.current) return;
    if (!isLoaded || !isSignedIn || !user) {
      toast.error('Sessão ainda sincronizando. Aguarde um instante.');
      return;
    }

    const submitRole = lockedRole ?? role;
    submitting.current = true;
    setSaving(true);
    try {
      const response = await fetch('/api/perfil/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: submitRole }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.erro || 'Falha ao concluir o cadastro.');
      }

      const persistedRole = parseAppRole(payload?.perfil?.role) ?? submitRole;
      const persistedKyc = payload?.perfil?.kyc_status as string | undefined;
      const persistedName = (payload?.perfil?.nome as string | undefined) ?? null;
      if (persistedName) setProfileName(persistedName);

      // Sincroniza os metadados APENAS depois de persistir o perfil.
      // `updateMetadata` rotaciona o token de sessão: se executado antes do
      // POST, derrubava a requisição com 401 e prendia o usuário no onboarding.
      // Uma falha aqui é inofensiva — o papel já está no banco e é a fonte de verdade.
      if (!lockedRole) {
        try {
          await user.updateMetadata({
            unsafeMetadata: {
              ...(user.unsafeMetadata || {}),
              role: persistedRole,
            },
          });
        } catch {
          // metadado é complementar; não bloqueia a entrada no painel
        }
      }

      setUser({
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? '',
        fullName:
          persistedName ||
          (user.unsafeMetadata?.full_name as string) ||
          (user.unsafeMetadata?.nome as string) ||
          user.fullName ||
          '',
      });
      setRole(persistedRole);

      // O refresh PRECISA vir antes do push: se `router.refresh()` roda depois
      // da navegação, ele revalida a árvore antiga (onboarding) e o usuário
      // "volta" para cá — o loop relatado de ver o painel por um instante.
      router.refresh();
      router.push(destinationForRole(persistedRole, persistedKyc));
    } catch (err) {
      submitting.current = false;
      toast.error(err instanceof Error ? err.message : 'Falha ao concluir o onboarding.');
    } finally {
      setSaving(false);
    }
  };

  if (!isLoaded || checking || !isSignedIn) {
    return (
      <div className="flex min-h-full items-center justify-center p-10">
        <TattooMachineLoader label="Preparando seu perfil" />
      </div>
    );
  }

  const effectiveRole = lockedRole ?? role;
  const content = getWelcomeContent(effectiveRole);
  const firstName =
    (profileName || (user?.unsafeMetadata?.full_name as string) || user?.firstName || '')
      .trim()
      .split(/\s+/)[0] ?? '';

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col space-y-8 overflow-y-auto p-4 pb-32 text-white sm:p-6 sm:pb-32">
      <div className="flex flex-col items-center space-y-4 pt-4 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 shadow-[0_0_24px_rgba(249,115,22,0.2)]">
          <Sparkles className="h-9 w-9 text-orange-500" strokeWidth={1.5} />
        </div>
        <header className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-500">
            Bem-vindo(a) ao TattooGo MK
          </p>
          <h1 className="text-2xl font-bold uppercase tracking-wide">
            {firstName ? `Bem-vindo(a), ${firstName}` : 'Bem-vindo(a)'}
          </h1>
          <p className="text-sm font-semibold text-orange-400">{content.title}</p>
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-zinc-400">
            {content.subtitle}
          </p>
        </header>
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <RoleSelector value={role} onChange={setLocalRole} lockedRole={lockedRole} />
      </section>

      <button
        type="button"
        onClick={handleAdvance}
        disabled={saving}
        className="mt-auto flex min-h-14 w-full items-center justify-center rounded-2xl bg-orange-500 py-4 text-base font-bold text-black shadow-[0_0_25px_rgba(249,115,22,0.55)] transition-all duration-300 hover:bg-orange-600 hover:shadow-[0_0_35px_rgba(249,115,22,0.8)] active:scale-95 disabled:opacity-50"
      >
        {saving ? <TattooMachineLoader compact label="Preparando" /> : 'Avançar'}
      </button>
    </div>
  );
}
