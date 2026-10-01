'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';
import { RoleSelector, type RegisterRole } from '@/components/features/role-selector';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
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
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;

    let cancelled = false;

    const bootstrap = async () => {
      try {
        const response = await fetch('/api/perfil/ensure', { cache: 'no-store' });
        if (response.status === 401) {
          return;
        }
        const payload = await response.json().catch(() => ({}));
        const existingRole = parseAppRole(payload?.perfil?.role);
        if (existingRole && !cancelled) {
          setRole(existingRole);
          router.replace(
            existingRole === 'tatuador' && payload?.perfil?.kyc_status !== 'aprovado'
              ? postSignupPathForRole(existingRole)
              : dashboardPathForRole(existingRole)
          );
          return;
        }

        const metadata = (user.unsafeMetadata || user.publicMetadata || {}) as Record<string, unknown>;
        const metadataRole = parseAppRole(metadata.role as string);
        if (metadataRole) setLocalRole(metadataRole);
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
    if (!user) {
      toast.error('Sessão ainda sincronizando. Aguarde um instante.');
      return;
    }

    setSaving(true);
    try {
      await user.updateMetadata({
        unsafeMetadata: {
          ...(user.unsafeMetadata || {}),
          role,
        },
      });

      const response = await fetch('/api/perfil/ensure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
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
      setRole(role);
      router.replace(postSignupPathForRole(role));
      router.refresh();
    } catch (err) {
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
        <RoleSelector value={role} onChange={setLocalRole} />
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
