'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';
import { RoleSelector, type RegisterRole } from '@/components/features/role-selector';
import { getRoleExperience } from '@/lib/content/role-experience';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { useAuthStore } from '@/hooks/use-auth-store';
import {
  dashboardPathForRole,
  isOnboardingComplete,
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
  const { getToken } = useAuth();
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

      const metadata = (user?.unsafeMetadata || user?.publicMetadata || {}) as Record<string, unknown>;
      const metadataRole = parseAppRole((metadata?.role as string) ?? null);
      if (metadataRole && !cancelled) {
        setLockedRole(metadataRole);
        setLocalRole(metadataRole);
      }

      try {
        if (!isLoaded || !isSignedIn || !user) {
          return;
        }
        const response = await fetch('/api/perfil/ensure', {
          cache: 'no-store',
          credentials: 'include',
        });
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

        if (existingRole && isOnboardingComplete(payload?.perfil) && !cancelled) {
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
      // Enviamos um Bearer SEMPRE renovado (`skipCache: true`). O `getToken()`
      // com cache podia devolver um token rotacionado pelo `updateMetadata` e
      // derrubar a requisição (401); forçando o fetch do token atual o header
      // passa a ser uma fonte de autenticação confiável. Mantemos o cookie via
      // `credentials: 'include'` como caminho complementar, cobrindo ambientes
      // onde o cookie é descartado (mobile/proxy) e o header não chega.
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
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          response.status === 401
            ? 'Sua sessão expirou. Recarregue a página e tente novamente.'
            : payload.erro || 'Falha ao concluir o cadastro.';
        throw new Error(message);
      }

      // Só navegamos quando o banco confirma a persistência do flag. Confiar no
      // HTTP 200 sem verificar o estado real recriava o loop: o layout devolvia
      // ao onboarding porque `has_seen_welcome_notice` continuava `false`.
      const persistedCompleted = isOnboardingComplete(payload?.perfil) || payload?.onboarding_completed === true;
      if (!persistedCompleted) {
        throw new Error(
          payload?.erro || 'Não foi possível concluir o cadastro. Tente novamente.'
        );
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
              ...(user?.unsafeMetadata || {}),
              role: persistedRole,
            },
          });
        } catch {
          // metadado é complementar; não bloqueia a entrada no painel
        }
      }

      setUser({
        id: user?.id ?? '',
        email: user?.primaryEmailAddress?.emailAddress ?? '',
        fullName:
          persistedName ||
          (user?.unsafeMetadata?.full_name as string) ||
          (user?.unsafeMetadata?.nome as string) ||
          user?.fullName ||
          '',
      });
      setRole(persistedRole);

      router.replace(destinationForRole(persistedRole, persistedKyc));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao concluir o onboarding.';
      toast.error(message);
    } finally {
      // Sempre devolve o botão ao estado ativo: tanto no erro (o usuário pode
      // tentar novamente) quanto em navegações que não desmontam o componente.
      submitting.current = false;
      setSaving(false);
    }
  };

  const effectiveRole = lockedRole ?? role;
  const content = getRoleExperience(effectiveRole).onboarding;

  if (!isLoaded || checking || !isSignedIn) {
    return (
      <div className="flex min-h-full items-center justify-center p-10">
        <TattooMachineLoader label={content.activating} />
      </div>
    );
  }

  const firstName =
    (profileName || (user?.unsafeMetadata?.full_name as string) || user?.firstName || '')
      .trim()
      .split(/\s+/)[0] ?? '';

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
            setLocalRole(nextRole);
          }}
          lockedRole={lockedRole}
        />
      </section>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[color-mix(in_srgb,var(--background)_88%,transparent)] backdrop-blur-xl">
        <div className="mx-auto w-full max-w-app p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:px-6">
          <button
            type="button"
            onClick={handleAdvance}
            disabled={saving}
            className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-orange-500 py-4 text-base font-bold text-black shadow-[0_0_25px_rgba(249,115,22,0.55)] transition-all duration-300 hover:bg-orange-600 hover:shadow-[0_0_35px_rgba(249,115,22,0.8)] active:scale-95 disabled:opacity-50"
          >
            {saving ? <TattooMachineLoader compact label="Preparando" /> : content.cta}
          </button>
        </div>
      </div>
    </div>
  );
}
