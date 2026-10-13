import { BootContinuation } from '@/components/layout/boot-continuation';

/**
 * Fallback de rota unificado (Fase 25.2).
 *
 * Em vez de um "ghost layout" de geometria — que aparecia como um degrau visual
 * distinto entre o splash e o conteúdo — pinta o MESMO canvas escuro do boot.
 * Nenhum skeleton, nenhum ícone, nada que possa piscar na troca.
 */
export default function ChatLoading() {
  return <BootContinuation />;
}
