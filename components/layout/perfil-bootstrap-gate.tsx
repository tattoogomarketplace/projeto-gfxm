'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { OnboardingLoadingScreen } from '@/components/features/onboarding-loading-screen';
import { markOnboardingGrace } from '@/lib/utils/session';

const RETRY_DELAY_MS = 1500;
const MAX_RETRIES = 20;

/**
 * Estado de espera durante a corrida pós-registro.
 *
 * O usuário já está autenticado no Clerk, mas o `Perfil` ainda não foi
 * persistido (webhook em processamento). Em vez de lançar erro ou redirecionar
 * para o onboarding, mantemos a UI viva: forçamos o auto-provisionamento
 * idempotente (`/api/perfil/ensure`) e revalidamos o Server Component a cada
 * 1,5s até o perfil existir — momento em que este gate é desmontado.
 */
export function PerfilBootstrapGate() {
  const { getToken } = useAuth();
  const retriesRef = useRef(0);
  const navigatingRef = useRef(false);
  const [exhausted, setExhausted] = useState(false);

  useEffect(() => {
    if (exhausted) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const scheduleRetry = () => {
      timer = setTimeout(async () => {
        if (cancelled || navigatingRef.current) return;
        if (retriesRef.current >= MAX_RETRIES) {
          setExhausted(true);
          return;
        }
        retriesRef.current += 1;
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
          if (response.status === 200) {
            navigatingRef.current = true;
            markOnboardingGrace();
            window.location.href = '/dashboard';
            return;
          }
        } catch {
          // Falha de rede: a próxima tentativa cobre.
        }
        if (cancelled) return;
        scheduleRetry();
      }, RETRY_DELAY_MS);
    };

    scheduleRetry();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [exhausted, getToken]);

  return (
    <OnboardingLoadingScreen variant="sparkles">
      {exhausted ? (
        <button
          type="button"
          onClick={() => {
            retriesRef.current = 0;
            setExhausted(false);
          }}
          className="min-h-11 rounded-xl border border-orange-500/40 bg-orange-500/10 px-5 text-sm font-semibold text-orange-400 shadow-[0_0_18px_rgba(249,115,22,0.25)] transition-colors hover:bg-orange-500/20"
        >
          Tentar novamente
        </button>
      ) : null}
    </OnboardingLoadingScreen>
  );
}
