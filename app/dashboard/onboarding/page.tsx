'use client';

import { useMemo, useRef, useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { toast } from '@/lib/toast';
import { Sparkles } from 'lucide-react';
import { RoleSelector, type RegisterRole } from '@/components/features/role-selector';
import { getRoleExperience } from '@/lib/content/role-experience';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { OnboardingSkeleton } from '@/components/features/onboarding-skeleton';
import { useAuthStore } from '@/hooks/use-auth-store';
import { useI18n } from '@/hooks/use-i18n';
import { BRAND_NAME } from '@/lib/i18n/brands';
import { markOnboardingGrace } from '@/lib/utils/session';
import {
  assignAppPath,
  destinationAfterProfileSync,
  isOnboardingComplete,
  parseAppRole,
  parseMetadataRole,
} from '@/lib/utils/auth-redirect';
import { formatAppError } from '@/lib/error-handler';
import type { MessageKey } from '@/lib/i18n/types';

function messageFromOnboardingError(
  status: number,
  t: (key: MessageKey) => string
): string {
  if (status === 409) return t('toast.onboardingCpfConflict');
  if (status === 401) return t('toast.onboardingSession');
  if (status === 403) return t('toast.onboardingLocked');
  return t('toast.profileSaveFailed');
}

export default function DashboardOnboardingPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const { t } = useI18n();
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
  const lockedRole = parseMetadataRole(user?.publicMetadata, user?.unsafeMetadata);
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
      toast.error(t('toast.sessionSyncing'));
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
        const errorMessage = messageFromOnboardingError(response.status, t);
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

      // Fluxo do cliente: a identidade (@username) é o passo imediato após o
      // CTA "Minha Jornada na Pele" (tela de boas-vindas). Estúdios não possuem
      // handle e tatuadores passam antes pela verificação de documentos, então
      // apenas o cliente entra neste degrau aqui.
      const destination = destinationAfterProfileSync(payload.perfil, payload.needsOnboarding);
      const startIdentityOnboarding =
        persistedRole === 'cliente' &&
        !payload.needsOnboarding &&
        isOnboardingComplete(payload.perfil);

      assignAppPath(
        startIdentityOnboarding
          ? '/dashboard/onboarding/username?flow=cliente'
          : destination
      );
    } catch (err) {
      const message = formatAppError(err, 'api');
      setSubmitError(message);
      toast.error(message);
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  const content = getRoleExperience(role).onboarding;

  if (!isLoaded) {
    return <OnboardingSkeleton />;
  }

  const firstName =
    (user?.firstName || '').trim() ||
    (profileName || '').trim().split(/\s+/).find(Boolean) ||
    '';

  return (
    <div className="gpu-layer relative flex h-full min-h-[100dvh] w-full flex-col overflow-x-hidden overflow-y-auto overscroll-none bg-background text-white [-webkit-overflow-scrolling:touch]">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="flex w-full shrink-0 flex-col items-center space-y-2.5 pt-2 text-center sm:space-y-3">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-zinc-950/55 shadow-[0_0_28px_rgba(255,102,0,0.28)] backdrop-blur-xl sm:h-20 sm:w-20">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_35%,rgba(255,102,0,0.22),transparent_68%)]"
            />
            <Sparkles className="relative h-7 w-7 text-[#FF6600] sm:h-8 sm:w-8" strokeWidth={1.5} />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#FF6600]">
            {t(content.badge, { brand: BRAND_NAME })}
          </p>
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
            {t(content.journey.past)}
          </p>
        </header>

        <div className="w-full shrink-0 space-y-3 py-4 text-center">
          <h1 className="max-w-full text-balance text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
            {firstName ? t('onboarding.helloNamed', { name: firstName }) : t('onboarding.hello')}
          </h1>
          <p className="text-balance text-base font-semibold text-zinc-200">{t(content.journey.present)}</p>
          <p className="mx-auto max-w-sm text-pretty text-sm leading-relaxed text-zinc-400">
            {t(content.journey.future)}
          </p>
        </div>

        <section className="w-full shrink-0 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6">
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
            className="mt-4 w-full shrink-0 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-pretty text-sm leading-relaxed text-red-200"
          >
            {submitError}
          </div>
        ) : null}

        <div className="min-h-4 flex-1" />
      </div>

      <div className="mx-auto w-full max-w-md shrink-0 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <button
          type="button"
          onClick={handleAdvance}
          disabled={saving}
          className="mx-auto flex h-14 min-h-14 w-full items-center justify-center rounded-2xl bg-orange-500 text-base font-bold text-black shadow-[0_0_25px_rgba(249,115,22,0.55)] transition-all duration-300 hover:bg-orange-600 hover:shadow-[0_0_35px_rgba(249,115,22,0.8)] active:scale-95 disabled:opacity-50"
        >
          {saving ? <TattooMachineLoader compact label={t(content.activating)} /> : t(content.cta)}
        </button>
      </div>
    </div>
  );
}
