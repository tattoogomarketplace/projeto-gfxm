import type { ClientHistorySession } from '@/lib/types/client-agenda';

/**
 * TATTOOGO MK — MOCK DO LIVRO-CAIXA DO CLIENTE (HISTÓRICO)
 *
 * Dados estáticos e estritamente tipados (`ClientHistorySession`) usados
 * enquanto a persistência real dos comprovantes não está acoplada à UI.
 * Cobrem duas sessões encerradas — o "estado arquivado" premium exibido abaixo
 * da sessão ativa, com selo de `TattooGo Pass` validado e CTA de comprovante.
 */
export const MOCK_CLIENT_HISTORY: readonly ClientHistorySession[] = [
  {
    artistName: 'Helena Prado',
    receiptCode: 'TG-2026-0518-014',
    agendamento: {
      id: 'mock-history-session-01',
      cliente_id: 'mock-cliente-01',
      tatuador_id: 'mock-artista-07',
      data_hora: '2026-05-18T14:00:00.000Z',
      status: 'concluido',
      valor_total: 1450,
      sinal_pago: true,
      version: 4,
    },
  },
  {
    artistName: 'Diego Ferrer',
    receiptCode: 'TG-2026-0302-008',
    agendamento: {
      id: 'mock-history-session-02',
      cliente_id: 'mock-cliente-01',
      tatuador_id: 'mock-artista-09',
      data_hora: '2026-03-02T18:30:00.000Z',
      status: 'concluido',
      valor_total: 900,
      sinal_pago: true,
      version: 5,
    },
  },
];
