import type { StudioActiveSession } from '@/lib/types/studio-agenda';

/**
 * TATTOOGO MK — MOCK DO ESTADO ATIVO DO ESTÚDIO
 *
 * Dados estáticos e estritamente tipados (`StudioActiveSession`) usados para
 * preencher o estado vazio da Agenda do Estúdio enquanto a persistência real
 * não está acoplada à UI. Representa a sessão de hoje (sinal de 25% retido em
 * escrow) — a mesma ponte de dados do lado do cliente — para que o tatuador
 * veja o card acionável do TattooGo Pass.
 *
 * A data é ancorada no dia corrente em horário local: o card deriva `isToday`
 * via `isSessionToday`, então o CTA de validação pulsa apenas quando a sessão
 * é de hoje. O fixture só é renderizado no cliente (após `isLoading` resolver),
 * então a avaliação em horário local nunca gera divergência de hidratação.
 */
function todayAt(hours: number, minutes: number, now: Date = new Date()): string {
  const next = new Date(now);
  next.setHours(hours, minutes, 0, 0);
  return next.toISOString();
}

export function buildMockStudioActiveSessions(
  now: Date = new Date()
): readonly StudioActiveSession[] {
  return [
    {
      clientName: 'Camila Fontes',
      agendamento: {
        id: 'mock-studio-active-session-01',
        cliente_id: 'mock-cliente-01',
        tatuador_id: 'mock-artista-01',
        data_hora: todayAt(18, 30, now),
        status: 'confirmado',
        valor_total: 1000,
        sinal_pago: true,
        version: 1,
      },
    },
  ];
}

/** Fixture de conveniência, resolvida apenas no cliente (pós-`isLoading`). */
export const MOCK_STUDIO_ACTIVE_SESSIONS: readonly StudioActiveSession[] =
  buildMockStudioActiveSessions();
