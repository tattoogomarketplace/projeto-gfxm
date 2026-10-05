'use client';

import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';

/**
 * Mantém usuários já autenticados fora das telas de login/cadastro.
 *
 * O `enabled` permite desligar o redirecionamento durante um fluxo ativo
 * (OTP, ativação de sessão, welcome), evitando que o próprio cadastro seja
 * interrompido enquanto a sessão acabou de ser criada.
 */
export function useRedirectIfAuthenticated(enabled = true): {
  isLoaded: boolean;
  isSignedIn: boolean;
  bridging: boolean;
} {
  const { isLoaded, isSignedIn } = useUser();
  const bridging = enabled && isLoaded && !!isSignedIn;

  useEffect(() => {
    if (!bridging) return;
    const timer = window.setTimeout(() => {
      window.location.assign('/dashboard');
    }, 160);
    return () => window.clearTimeout(timer);
  }, [bridging]);

  return { isLoaded, isSignedIn: !!isSignedIn, bridging };
}
