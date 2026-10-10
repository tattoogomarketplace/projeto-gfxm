/**
 * TATTOOGO MK — ESTADO ATIVO DO CLIENTE (AGENDA)
 *
 * Contrato do "estado ativo" da linha do tempo do cliente: o agendamento em
 * curso somado ao nome de exibição do artista. É um view model puro — reusa a
 * verdade do domínio (`Agendamento`) e nunca decide valores. O sinal de 25%
 * continua derivado de `buildSessionTimeline` (motor financeiro do backend).
 */

import type { Agendamento } from '@/lib/types/database';

/** Sessão ativa projetada para o card de destaque do cliente. */
export interface ClientActiveSession {
  readonly agendamento: Agendamento;
  /** Nome de exibição do artista responsável pela sessão. */
  readonly artistName: string;
}

/**
 * Sessão encerrada projetada para o "Livro-Caixa" (Histórico Premium).
 *
 * Reusa a verdade do domínio (`Agendamento`) e acrescenta apenas o código
 * imutável do comprovante (`receiptCode`) e o nome de exibição do artista.
 * Presentacional: a UI nunca recalcula valores — apenas projeta o recibo.
 */
export interface ClientHistorySession {
  readonly agendamento: Agendamento;
  /** Nome de exibição do artista que assinou a sessão. */
  readonly artistName: string;
  /** Código intocável do comprovante emitido pelo motor financeiro. */
  readonly receiptCode: string;
}
