import type { ClientActiveSession } from '@/lib/types/client-agenda';

/**
 * TATTOOGO MK — MOCK DO ESTADO ATIVO DO CLIENTE
 *
 * Dados estáticos e estritamente tipados (`ClientActiveSession`) usados
 * enquanto a persistência real não está acoplada à UI. Cobrem as duas etapas
 * acionáveis da jornada: "01 Ação Necessária" (termo a assinar) e
 * "02 Aguardando Pagamento" (sinal de 25%).
 */
export const MOCK_ACTIVE_SESSIONS: readonly ClientActiveSession[] = [
  {
    artistName: 'Marina Alves',
    agendamento: {
      id: 'mock-active-session-01',
      cliente_id: 'mock-cliente-01',
      tatuador_id: 'mock-artista-01',
      data_hora: '2026-11-14T18:30:00.000Z',
      status: 'rascunho',
      valor_total: 1200,
      sinal_pago: false,
      version: 1,
    },
  },
  {
    artistName: 'Rafael Costa',
    agendamento: {
      id: 'mock-active-session-02',
      cliente_id: 'mock-cliente-01',
      tatuador_id: 'mock-artista-02',
      data_hora: '2026-12-02T15:00:00.000Z',
      status: 'aguardando_sinal',
      valor_total: 1800,
      sinal_pago: false,
      version: 2,
    },
  },
];
