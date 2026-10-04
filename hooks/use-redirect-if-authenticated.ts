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
} {
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (!enabled || !isLoaded || !isSignedIn) return;
    window.location.href = '/dashboard';
  }, [enabled, isLoaded, isSignedIn]);

  return { isLoaded, isSignedIn: !!isSignedIn };
}
