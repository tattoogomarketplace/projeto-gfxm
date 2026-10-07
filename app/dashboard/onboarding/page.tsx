'use client';

import { useMemo, useRef, useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { toast } from '@/lib/toast';
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
      <div className="gpu-layer relative flex h-[100dvh] max-h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-background">
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto overscroll-none px-4 py-6 [-webkit-overflow-scrolling:touch]">
          <TattooMachineLoader label={getOnboardingLoadingMessage(role)} />
        </div>
      </div>
    );
  }

  const firstName = (profileName || '').trim().split(/\s+/)[0] ?? '';

  return (
    <div className="gpu-layer relative flex h-[100dvh] w-full min-h-0 flex-col overflow-hidden bg-background text-white">
      <header className="mx-auto flex w-full max-w-lg flex-shrink-0 flex-col items-center space-y-2.5 px-4 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-2 text-center sm:space-y-3 sm:px-6 sm:pt-[calc(env(safe-area-inset-top)+1.5rem)]">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 shadow-[0_0_24px_rgba(249,115,22,0.2)] sm:h-24 sm:w-24">
          <Sparkles className="h-8 w-8 text-orange-500 sm:h-9 sm:w-9" strokeWidth={1.5} />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-orange-500">
          {content.badge}
        </p>
        <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
          {content.journey.past}
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-none px-4 [-webkit-overflow-scrolling:touch]">
        <div className="mx-auto flex min-h-full w-full max-w-lg flex-col py-4 sm:py-6">
          <div className="my-auto flex w-full flex-col gap-6 sm:gap-8">
            <div className="space-y-3 text-center">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
                {firstName ? `Olá, ${firstName}!` : 'Olá!'}
              </h1>
              <p className="text-base font-semibold text-zinc-200">{content.journey.present}</p>
              <p className="mx-auto max-w-sm text-sm leading-relaxed text-zinc-400">
                {content.journey.future}
              </p>
            </div>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6">
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
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-border/20 bg-background/95 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur sm:px-6">
        <button
          type="button"
          onClick={handleAdvance}
          disabled={saving}
          className="mx-auto flex min-h-14 w-full max-w-lg items-center justify-center rounded-2xl bg-orange-500 py-4 text-base font-bold text-black shadow-[0_0_25px_rgba(249,115,22,0.55)] transition-all duration-300 hover:bg-orange-600 hover:shadow-[0_0_35px_rgba(249,115,22,0.8)] active:scale-95 disabled:opacity-50"
        >
          {saving ? <TattooMachineLoader compact label={content.activating} /> : content.cta}
        </button>
      </div>
    </div>
  );
}
