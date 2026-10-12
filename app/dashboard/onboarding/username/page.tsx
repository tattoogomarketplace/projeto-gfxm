'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import { AnimatePresence, motion } from 'framer-motion';
import { OnboardingUsername } from '@/components/features/onboarding-username';
import { authedFetch } from '@/lib/utils/authed-fetch';
import { BRAND_NAME } from '@/lib/i18n/brands';
import {
  assignAppPath,
  dashboardPathForRole,
  normalizeAppRole,
  type AppRole,
} from '@/lib/utils/auth-redirect';

/**
 * TATTOOGO MK — Rota do onboarding de identidade (@username).
 *
 * Vive sob `/dashboard/onboarding` (portanto "sem casco": sem header, dock ou
 * FAB). É o passo visual imediatamente posterior a:
 *   1) CTA "Minha Jornada na Pele" do fluxo do cliente; e
 *   2) fase de verificação de documentos, no fluxo do artista.
 *
 * Guarda de idempotência (front-end, sem tocar no backend): se o perfil já
 * possui `username`, a trava de 30 dias impede nova troca — então seguimos
 * direto para o painel do papel, evitando que a tela vire um gate permanente.
 */

/**
 * Loading premium do onboarding de identidade (Apple-tier / Dark Luxury).
 *
 * Geometria 100% determinística e FORA DO FLUXO (`fixed inset-0` +
 * `min-h-[100dvh]`), reaproveitando exatamente o mesmo gradiente radial do
 * formulário `OnboardingUsername`. Como a troca loader → input não recalcula
 * nenhum bounding box, o layout shift é matematicamente nulo (CLS = 0).
 */
function UsernameOnboardingLoader() {
  return (
    <div
      className="fixed inset-0 z-50 flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden overscroll-none bg-background px-4 py-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      style={{
        background:
          'radial-gradient(120% 120% at 50% 0%, #131313 0%, #0a0a0a 55%, #050505 100%)',
      }}
      role="status"
      aria-live="polite"
      aria-label="Preparando sua identidade..."
    >
      <div className="relative flex flex-col items-center gap-6">
        <span className="relative flex h-16 w-16 items-center justify-center">
          <span aria-hidden className="absolute inset-0 rounded-full border border-white/[0.06]" />
          <span
            aria-hidden
            className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-r-orange-500/30 border-t-orange-500 [animation-duration:1.1s]"
          />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500 shadow-[0_0_16px_rgba(249,115,22,0.85)]" />
        </span>
        <div className="space-y-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-500">
            {BRAND_NAME}
          </p>
          <p className="animate-pulse text-sm tracking-widest text-zinc-400">
            Preparando sua identidade...
          </p>
        </div>
      </div>
    </div>
  );
}

function UsernameOnboardingInner() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const params = useSearchParams();

  const flow = params.get('flow') === 'tatuador' ? 'tatuador' : 'cliente';
  const [role, setRole] = useState<AppRole | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const metadataRole = normalizeAppRole(
        ((user?.unsafeMetadata || user?.publicMetadata || {}) as Record<string, unknown>).role as
          | string
          | undefined
      );

      try {
        const res = await authedFetch('/api/perfil/ensure', {}, () =>
          getToken({ skipCache: true })
        );
        const payload = (await res.json().catch(() => ({}))) as {
          perfil?: { role?: string | null; username?: string | null } | null;
        };
        if (cancelled) return;

        const perfil = payload?.perfil ?? null;
        const resolvedRole = perfil?.role ? normalizeAppRole(perfil.role) : metadataRole;

        // Já possui handle: a identidade está travada — segue para o painel.
        if (perfil?.username) {
          assignAppPath(dashboardPathForRole(resolvedRole));
          return;
        }

        setRole(resolvedRole);
        setChecking(false);
      } catch {
        if (cancelled) return;
        setRole(metadataRole);
        setChecking(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [getToken, user]);

  return (
    <AnimatePresence initial={false}>
      {checking || !role ? (
        <motion.div
          key="username-loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
        >
          <UsernameOnboardingLoader />
        </motion.div>
      ) : (
        <motion.div
          key="username-form"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
        >
          <OnboardingUsername
            role={role}
            flow={flow}
            onCompleted={() => assignAppPath(dashboardPathForRole(role))}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function UsernameOnboardingPage() {
  return (
    <Suspense fallback={<UsernameOnboardingLoader />}>
      <UsernameOnboardingInner />
    </Suspense>
  );
}
