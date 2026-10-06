'use client';

import { useMemo, useRef, useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';
import { RoleSelector, type RegisterRole } from '@/components/features/role-selector';
import { getOnboardingLoadingMessage, getRoleExperience } from '@/lib/content/role-experience';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { useAuthStore } from '@/hooks/use-auth-store';
import { markOnboardingGrace } from '@/lib/utils/session';
import {
  assignAppPath,
  destinationAfterProfileSync,
  parseAppRole,
} from '@/lib/utils/auth-redirect';

function messageFromOnboardingError(status: number, data: { erro?: unknown }): string {
  const fromApi = typeof data.erro === 'string' ? data.erro.trim() : '';
  if (status === 409) {
    return fromApi || 'Este CPF já está cadastrado ou em uso por outra conta';
  }
  if (status === 401) {
    return 'Sua sessão expirou. Recarregue a página e tente novamente.';
  }
  if (status === 403) {
    return fromApi || 'O perfil é definido no cadastro e não pode ser alterado.';
  }
  return fromApi || 'Erro ao salvar perfil';
}

export default function DashboardOnboardingPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const setUser = useAuthStore((s) => s.setUser);
  const setStoreRole = useAuthStore((s) => s.setRole);
  const [selectedRole, setSelectedRole] = useState<RegisterRole | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submitting = useRef(false);

  const metadata = useMemo(
    () => (user?.unsafeMetadata || user?.publicMetadata || {}) as Record<string, unknown>,
    [user]
  );
  const lockedRole = parseAppRole((metadata.role as string) ?? null);
  const role: RegisterRole = lockedRole ?? selectedRole ?? 'cliente';
  const profileName =
    (metadata.full_name as string | undefined) ||
    (metadata.nome as string | undefined) ||
    user?.fullName ||
    user?.firstName ||
    null;

  const handleAdvance = async () => {
    if (submitting.current) return;
    if (!isLoaded || !isSignedIn || !user) {
      toast.error('Sessão ainda sincronizando. Aguarde um instante.');
      return;
    }

    markOnboardingGrace();
    const submitRole = lockedRole ?? role;
    submitting.current = true;
    setSaving(true);
    setSubmitError(null);
    try {
      const token = await getToken({ skipCache: true });
      const response = await fetch('/api/perfil/onboarding', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ role: submitRole }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        erro?: unknown;
        needsOnboarding?: boolean;
        perfil?: {
          role?: string | null;
          nome?: string | null;
          kyc_status?: string | null;
          has_seen_welcome_notice?: boolean | null;
          onboarding_completed?: boolean | null;
        };
      };
      if (!response.ok) {
        const errorMessage = messageFromOnboardingError(response.status, payload);
        setSubmitError(errorMessage);
        toast.error(errorMessage);
        return;
      }

      const persistedRole = parseAppRole(payload?.perfil?.role) ?? submitRole;
      const persistedName = (payload?.perfil?.nome as string | undefined) ?? null;

      if (!lockedRole) {
        try {
          await user.updateMetadata({
            unsafeMetadata: {
              ...(user.unsafeMetadata || {}),
              role: persistedRole,
            },
          });
        } catch {
          // metadado é complementar; o papel já está no banco
        }
      }

      setUser({
        id: user.id ?? '',
        email: user.primaryEmailAddress?.emailAddress ?? '',
        fullName:
          persistedName ||
          (user.unsafeMetadata?.full_name as string) ||
          (user.unsafeMetadata?.nome as string) ||
          user.fullName ||
          '',
      });
      setStoreRole(persistedRole);

      assignAppPath(destinationAfterProfileSync(payload.perfil, payload.needsOnboarding));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar perfil';
      setSubmitError(message);
      toast.error(message);
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  const content = getRoleExperience(role).onboarding;

  if (!isLoaded) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#121212] p-10">
        <TattooMachineLoader label={getOnboardingLoadingMessage(role)} />
      </div>
    );
  }

  const firstName = (profileName || '').trim().split(/\s+/)[0] ?? '';

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col space-y-8 p-4 pb-40 text-white sm:p-6 sm:pb-40">
      <div className="flex flex-col items-center space-y-4 pt-4 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 shadow-[0_0_24px_rgba(249,115,22,0.2)]">
          <Sparkles className="h-9 w-9 text-orange-500" strokeWidth={1.5} />
        </div>
        <header className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-orange-500">
            {content.badge}
          </p>
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
            {content.journey.past}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {firstName ? `Olá, ${firstName}!` : 'Olá!'}
          </h1>
          <p className="text-base font-semibold text-zinc-200">{content.journey.present}</p>
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-zinc-400">
            {content.journey.future}
          </p>
        </header>
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <RoleSelector
          value={role}
          onChange={(nextRole) => {
            setSubmitError(null);
            setSelectedRole(nextRole);
          }}
          lockedRole={lockedRole}
        />
      </section>

      {submitError ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm leading-relaxed text-red-200"
        >
          {submitError}
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[color-mix(in_srgb,var(--background)_88%,transparent)] backdrop-blur-xl">
        <div className="mx-auto w-full max-w-app p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:px-6">
          <button
            type="button"
            onClick={handleAdvance}
            disabled={saving}
            className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-orange-500 py-4 text-base font-bold text-black shadow-[0_0_25px_rgba(249,115,22,0.55)] transition-all duration-300 hover:bg-orange-600 hover:shadow-[0_0_35px_rgba(249,115,22,0.8)] active:scale-95 disabled:opacity-50"
          >
            {saving ? <TattooMachineLoader compact label={content.activating} /> : content.cta}
          </button>
        </div>
      </div>
    </div>
  );
}
