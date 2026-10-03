'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (!enabled || !isLoaded || !isSignedIn) return;
    router.replace('/dashboard');
  }, [enabled, isLoaded, isSignedIn, router]);

  return { isLoaded, isSignedIn: !!isSignedIn };
}
