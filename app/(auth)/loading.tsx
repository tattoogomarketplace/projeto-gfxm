import { BootContinuation } from '@/components/layout/boot-continuation';

/**
 * Fallback de rota unificado (Fase 25.2).
 *
 * Substitui o skeleton do formulário de autenticação: no boot, a rota revelada
 * após o splash é o MESMO canvas escuro, nunca um skeleton genérico.
 */
export default function AuthLoading() {
  return <BootContinuation />;
}
