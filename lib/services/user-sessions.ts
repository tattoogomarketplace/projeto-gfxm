import { prisma } from '@/lib/prisma';
import { mockSessionsForUser, MOCK_SESSION_CLIENT_ID } from '@/lib/mocks/user-sessions';
import type { Agendamento } from '@/lib/types/database';
import type {
  SessionStatus,
  UserSession,
  UserSessionPeer,
  UserSessionsPayload,
} from '@/lib/types/user-session';

export class UserSessionError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'UserSessionError';
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SESSION_SELECT = {
  id: true,
  cliente_id: true,
  tatuador_id: true,
  data_hora: true,
  status: true,
  valor_total: true,
  valor_sinal: true,
  sinal_pago: true,
  waiver_signed: true,
  session_status: true,
  cliente: {
    select: { id: true, nome: true, role: true },
  },
  tatuador: {
    select: { id: true, nome: true, role: true },
  },
} as const;

type SessionRow = {
  id: string;
  cliente_id: string;
  tatuador_id: string;
  data_hora: Date;
  status: Agendamento['status'];
  valor_total: { toString(): string } | number | string;
  valor_sinal: { toString(): string } | number | string;
  sinal_pago: boolean;
  waiver_signed: boolean;
  session_status: SessionStatus | null;
  cliente: { id: string; nome: string | null; role: string } | null;
  tatuador: { id: string; nome: string | null; role: string } | null;
};

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function toMoney(value: { toString(): string } | number | string | null | undefined): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Number(value.toFixed(2));
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? Number(numeric.toFixed(2)) : 0;
}

function displayName(nome: string | null | undefined, fallback: string): string {
  const trimmed = (nome ?? '').trim();
  return trimmed || fallback;
}

function toPeerRole(role: string | null | undefined): UserSessionPeer['role'] {
  if (role === 'tatuador' || role === 'estudio' || role === 'cliente') return role;
  return 'cliente';
}

function toPeer(
  row: { id: string; nome: string | null; role: string } | null,
  fallbackId: string,
  fallbackRole: UserSessionPeer['role']
): UserSessionPeer {
  return {
    id: row?.id || fallbackId,
    name: displayName(row?.nome, ''),
    role: toPeerRole(row?.role) || fallbackRole,
  };
}

export function deriveSessionStatus(
  lifecycle: Agendamento['status'],
  stored?: SessionStatus | null
): SessionStatus | null {
  if (stored) return stored;
  if (lifecycle === 'rascunho') return 'ACTION_NEEDED';
  if (lifecycle === 'aguardando_sinal') return 'AWAITING_PAYMENT';
  if (lifecycle === 'confirmado') return 'CONFIRMED';
  if (lifecycle === 'concluido') return 'COMPLETED';
  return null;
}

function toUserSession(row: SessionRow): UserSession | null {
  const sessionStatus = deriveSessionStatus(row.status, row.session_status);
  if (!sessionStatus) return null;
  const totalValue = toMoney(row.valor_total);
  const depositValue = toMoney(row.valor_sinal) || Number((totalValue * 0.25).toFixed(2));
  return {
    id: row.id,
    clientId: row.cliente_id,
    artistId: row.tatuador_id,
    date: row.data_hora.toISOString(),
    totalValue,
    depositValue,
    depositPaid: Boolean(row.sinal_pago),
    waiverSigned: Boolean(row.waiver_signed),
    sessionStatus,
    lifecycleStatus: row.status,
    client: toPeer(row.cliente, row.cliente_id, 'cliente'),
    artist: toPeer(row.tatuador, row.tatuador_id, 'tatuador'),
  };
}

function payloadFor(userId: string, sessions: UserSession[]): UserSessionsPayload {
  return {
    userId,
    sessions: sessions.slice().sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export async function getUserSessions(userId: string): Promise<UserSessionsPayload> {
  const id = (userId ?? '').trim();
  if (!id) {
    throw new UserSessionError(400, 'Usuário inválido.');
  }

  if (!isUuid(id)) {
    return payloadFor(id, mockSessionsForUser(MOCK_SESSION_CLIENT_ID));
  }

  try {
    const rows = await prisma.agendamento.findMany({
      where: {
        deleted_at: null,
        status: { not: 'cancelado' },
        OR: [{ cliente_id: id }, { tatuador_id: id }],
      },
      select: SESSION_SELECT,
      orderBy: { data_hora: 'asc' },
    });

    const sessions = rows
      .map((row) => toUserSession(row as SessionRow))
      .filter((item): item is UserSession => item != null);

    if (sessions.length > 0) {
      return payloadFor(id, sessions);
    }
    return payloadFor(id, mockSessionsForUser(MOCK_SESSION_CLIENT_ID));
  } catch (error) {
    if (error instanceof UserSessionError) throw error;
    return payloadFor(id, mockSessionsForUser(MOCK_SESSION_CLIENT_ID));
  }
}
