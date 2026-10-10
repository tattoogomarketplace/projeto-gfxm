/**
 * TATTOOGO MK — ESTADO ATIVO DO ESTÚDIO (AGENDA)
 *
 * Espelho do view model do cliente para o lado operacional do tatuador/estúdio:
 * a sessão em curso somada ao nome de exibição do cliente. É um view model puro
 * — reusa a verdade do domínio (`Agendamento`) e nunca decide valores. O sinal
 * de 25% continua derivado de `depositAmount` (motor financeiro do backend).
 */

import type { Agendamento } from '@/lib/types/database';

/** Sessão ativa projetada para o card de destaque do estúdio. */
export interface StudioActiveSession {
  readonly agendamento: Agendamento;
  /** Nome de exibição do cliente atendido na sessão. */
  readonly clientName: string;
}
