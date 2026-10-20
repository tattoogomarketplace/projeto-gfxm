import type { UserSession } from '@/lib/types/user-session';

export const MOCK_SESSION_CLIENT_ID = 'mock-cliente-01';

const CLIENT: UserSession['client'] = {
  id: MOCK_SESSION_CLIENT_ID,
  name: 'Ana Beatriz',
  role: 'cliente',
};

const MARINA: UserSession['artist'] = {
  id: 'mock-artista-01',
  name: 'Marina Alves',
  role: 'tatuador',
};

const RAFAEL: UserSession['artist'] = {
  id: 'mock-artista-02',
  name: 'Rafael Costa',
  role: 'tatuador',
};

const BIANCA: UserSession['artist'] = {
  id: 'mock-artista-03',
  name: 'Bianca Souza',
  role: 'tatuador',
};

/**
 * Three canonical timeline fixtures for the current client:
 * 1. ACTION_NEEDED — termo de responsabilidade pending
 * 2. AWAITING_PAYMENT — 25% deposit outstanding
 * 3. CONFIRMED — waiver signed and signal paid
 */
export const MOCK_USER_SESSIONS: readonly UserSession[] = [
  {
    id: 'mock-timeline-session-01',
    clientId: MOCK_SESSION_CLIENT_ID,
    artistId: MARINA.id,
    date: '2026-10-28T18:30:00.000Z',
    totalValue: 1200,
    depositValue: 300,
    depositPaid: false,
    waiverSigned: false,
    sessionStatus: 'ACTION_NEEDED',
    lifecycleStatus: 'rascunho',
    client: CLIENT,
    artist: MARINA,
  },
  {
    id: 'mock-timeline-session-02',
    clientId: MOCK_SESSION_CLIENT_ID,
    artistId: RAFAEL.id,
    date: '2026-11-14T15:00:00.000Z',
    totalValue: 1800,
    depositValue: 450,
    depositPaid: false,
    waiverSigned: true,
    sessionStatus: 'AWAITING_PAYMENT',
    lifecycleStatus: 'aguardando_sinal',
    client: CLIENT,
    artist: RAFAEL,
  },
  {
    id: 'mock-timeline-session-03',
    clientId: MOCK_SESSION_CLIENT_ID,
    artistId: BIANCA.id,
    date: '2026-12-02T16:00:00.000Z',
    totalValue: 2400,
    depositValue: 600,
    depositPaid: true,
    waiverSigned: true,
    sessionStatus: 'CONFIRMED',
    lifecycleStatus: 'confirmado',
    client: CLIENT,
    artist: BIANCA,
  },
];

export function mockSessionsForUser(userId: string): UserSession[] {
  return MOCK_USER_SESSIONS.filter(
    (session) => session.clientId === userId || session.artistId === userId
  ).slice()
    .sort((a, b) => a.date.localeCompare(b.date));
}
