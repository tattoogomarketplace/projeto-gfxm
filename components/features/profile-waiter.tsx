'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { OnboardingLoadingScreen } from '@/components/features/onboarding-loading-screen';
import { isOnboardingGrace, markOnboardingGrace } from '@/lib/utils/session';
import { destinationAfterProfileSync, LOGIN_PATH } from '@/lib/utils/auth-redirect';

const POLL_INTERVAL_MS = 1500;
const MAX_ATTEMPTS = 40;
const SIGNED_OUT_REDIRECT_MS = 8000;

type EnsurePayload = {
  sucesso?: boolean;
  perfil?: {
    role?: string | null;
    kyc_status?: string | null;
    has_seen_welcome_notice?: boolean | null;
    onboarding_completed?: boolean | null;
  } | null;
  needsOnboarding?: boolean;
};

/**
 * Espera ativa pela persistência do `Perfil` (corrida pós-registro).
 *
 * O Server Component do dashboard não pode lançar/estourar o Error Boundary
 * quando o usuário já está autenticado no Clerk mas o registro local ainda não
 * existe (webhook em processamento). Este componente assume o controle no
 * cliente: pinga `/api/perfil/ensure` (idempotente, auto-provisiona e devolve o
 * `perfil`) a cada 1,5s e SÓ navega no HTTP 200 com perfil confirmado.
 */
export function ProfileWaiter() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const attemptsRef = useRef(0);
  const navigatingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [exhausted, setExhausted] = useState(false);
  const [restartKey, setRestartKey] = useState(0);

  useEffect(() => {
    if (!isLoaded || isSignedIn) return;
    if (isOnboardingGrace()) return;
    const timer = window.setTimeout(() => {
      if (isOnboardingGrace() || navigatingRef.current) return;
      window.location.href = LOGIN_PATH;
    }, SIGNED_OUT_REDIRECT_MS);
    return () => window.clearTimeout(timer);
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    let cancelled = false;

    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    if (!isLoaded) {
      return () => {
        cancelled = true;
        stopPolling();
      };
    }

    const navigate = (payload: EnsurePayload) => {
      if (navigatingRef.current) return;
      navigatingRef.current = true;
      stopPolling();
      markOnboardingGrace();
      window.location.href = destinationAfterProfileSync(
        payload.perfil,
        payload.needsOnboarding
      );
    };

    const checkProfile = async () => {
      if (cancelled || navigatingRef.current) return;

      if (attemptsRef.current >= MAX_ATTEMPTS) {
        setExhausted(true);
        stopPolling();
        return;
      }
      attemptsRef.current += 1;

      try {
        const token = await getToken({ skipCache: true });
        const response = await fetch('/api/perfil/ensure', {
          cache: 'no-store',
          credentials: 'include',
          headers: {
            accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (cancelled || navigatingRef.current) return;

        if (response.status === 401 || !response.ok) return;

        const data = (await response.json().catch(() => null)) as EnsurePayload | null;
        if (data?.perfil) {
          navigate(data);
        }
      } catch {
        // Rede instável ou sessão ainda não pronta: a próxima iteração cobre.
      }
    };

    void checkProfile();
    intervalRef.current = setInterval(checkProfile, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [restartKey, isLoaded, getToken]);

  const handleRetry = useCallback(() => {
    attemptsRef.current = 0;
    navigatingRef.current = false;
    setExhausted(false);
    setRestartKey((key) => key + 1);
  }, []);

  return (
    <OnboardingLoadingScreen variant="sparkles">
      {exhausted ? (
        <button
          type="button"
          onClick={handleRetry}
          className="min-h-11 rounded-xl border border-orange-500/40 bg-orange-500/10 px-5 text-sm font-semibold text-orange-400 shadow-[0_0_18px_rgba(249,115,22,0.25)] transition-colors hover:bg-orange-500/20"
        >
          Tentar novamente
        </button>
      ) : null}
    </OnboardingLoadingScreen>
  );
}

export default ProfileWaiter;
