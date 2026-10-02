'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';
import { RoleSelector, type RegisterRole } from '@/components/features/role-selector';
import { getWelcomeContent } from '@/components/features/welcome-gate';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { Sparkles } from 'lucide-react';
import { useAuthStore } from '@/hooks/use-auth-store';
import {
  dashboardPathForRole,
  parseAppRole,
  postSignupPathForRole,
} from '@/lib/utils/auth-redirect';

export default function DashboardOnboardingPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const setUser = useAuthStore((s) => s.setUser);
  const setRole = useAuthStore((s) => s.setRole);
  const [role, setLocalRole] = useState<RegisterRole>('cliente');
  const [lockedRole, setLockedRole] = useState<RegisterRole | null>(null);
  const [completedRole, setCompletedRole] = useState<RegisterRole | null>(null);
  const completedRef = useRef<RegisterRole | null>(null);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);

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
        if (isLoaded && response.status === 401) {
          router.replace('/login');
          return;
        }
        const payload = await response.json().catch(() => ({}));
        const existingRole = parseAppRole(payload?.perfil?.role);
        if (existingRole && !cancelled) {
          setLockedRole(existingRole);
          setRole(existingRole);
          router.replace(
            existingRole === 'tatuador' && payload?.perfil?.kyc_status !== 'aprovado'
              ? postSignupPathForRole(existingRole)
              : dashboardPathForRole(existingRole)
          );
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

  const handleContinue = async () => {
    if (!isLoaded || !isSignedIn || !user) {
      toast.error('Sessão ainda sincronizando. Aguarde um instante.');
      return;
    }

    const submitRole = lockedRole ?? role;

    setSaving(true);
    try {
      // Se o papel já veio do cadastro, ele é imutável: não regravamos metadados
      // (evita rotacionar o token de sessão e derrubar a requisição com 401).
      if (!lockedRole) {
        await user.updateMetadata({
          unsafeMetadata: {
            ...(user.unsafeMetadata || {}),
            role: submitRole,
          },
        });
      }

      const response = await fetch('/api/perfil/ensure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: submitRole }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.erro || 'Falha ao criar o perfil local.');
      }

      setUser({
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? '',
        fullName:
          (user.unsafeMetadata?.full_name as string) ||
          (user.unsafeMetadata?.nome as string) ||
          user.fullName ||
          '',
      });
      setRole(submitRole);
      completedRef.current = submitRole;
      setCompletedRole(submitRole);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao concluir o onboarding.');
    } finally {
      setSaving(false);
    }
  };

  const handleEnterDashboard = () => {
    const target = completedRef.current ?? completedRole;
    if (!target) return;
    router.replace(postSignupPathForRole(target));
    router.refresh();
  };

  if (!isLoaded || checking || !isSignedIn) {
    return (
      <div className="flex min-h-full items-center justify-center p-10">
        <TattooMachineLoader label="Preparando seu perfil" />
      </div>
    );
  }

  if (completedRole) {
    const content = getWelcomeContent(completedRole);
    return (
      <div className="mx-auto flex min-h-full max-w-lg flex-col items-center justify-center space-y-6 p-4 text-center text-white sm:p-6">
        <div className="flex h-28 w-28 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 shadow-[0_0_24px_rgba(249,115,22,0.2)]">
          <Sparkles className="h-10 w-10 text-orange-500" strokeWidth={1.5} />
        </div>
        <header className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-500">
            Perfil criado
          </p>
          <h1 className="text-2xl font-bold">{content.title}</h1>
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-zinc-400">
            {content.subtitle}
          </p>
        </header>
        <button
          type="button"
          onClick={handleEnterDashboard}
          className="flex min-h-11 w-full max-w-sm items-center justify-center rounded-lg bg-orange-500 py-3 font-bold text-black transition-all hover:bg-orange-600 active:scale-95"
        >
          {content.cta}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col justify-center space-y-6 p-4 sm:p-6 text-white">
      <header className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-500">
          Completar cadastro
        </p>
        <h1 className="text-2xl font-bold">Como você vai usar o TattooGo MK?</h1>
        <p className="text-sm leading-relaxed text-zinc-400">
          Sua conta Clerk já está ativa. Falta só criar o perfil local para liberar o painel.
        </p>
      </header>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <RoleSelector value={role} onChange={setLocalRole} lockedRole={lockedRole} />
        <button
          type="button"
          onClick={handleContinue}
          disabled={saving}
          className="mt-6 flex min-h-11 w-full items-center justify-center rounded-lg bg-orange-500 py-3 font-bold text-black transition-all hover:bg-orange-600 active:scale-95 disabled:opacity-50"
        >
          {saving ? <TattooMachineLoader compact label="Criando perfil" /> : 'Continuar para o painel'}
        </button>
      </section>
    </div>
  );
}
