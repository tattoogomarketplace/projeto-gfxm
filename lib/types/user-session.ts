/**
 * TATTOOGO MK — AGENDA / TIMELINE DATA CONTRACT
 *
 * Canonical session DTO for the Agenda state machine. Maps onto `Agendamento`
 * without duplicating the booking table:
 *   totalValue    <-> valor_total
 *   depositValue  <-> valor_sinal (25% signal)
 *   date          <-> data_hora
 *   waiverSigned  <-> waiver_signed
 *   sessionStatus <-> session_status (derived from AgendamentoStatus when null)
 */

import type { Agendamento } from '@/lib/types/database';

export type SessionStatus =
  | 'ACTION_NEEDED'
  | 'AWAITING_PAYMENT'
  | 'CONFIRMED'
  | 'COMPLETED';

export type UserSessionPeer = {
  id: string;
  name: string;
  role: 'cliente' | 'tatuador' | 'estudio';
};

export type UserSession = {
  id: string;
  clientId: string;
  artistId: string;
  date: string;
  totalValue: number;
  depositValue: number;
  depositPaid: boolean;
  waiverSigned: boolean;
  sessionStatus: SessionStatus;
  lifecycleStatus: Agendamento['status'];
  client: UserSessionPeer;
  artist: UserSessionPeer;
};

export type UserSessionsPayload = {
  userId: string;
  sessions: UserSession[];
};
