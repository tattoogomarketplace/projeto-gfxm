import { prisma } from '@/lib/prisma';
import type { Agendamento } from '@/lib/types/database';

export class AgendamentoQueryError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'AgendamentoQueryError';
  }
}

const LIST_LIMIT = 100;

const LIST_SELECT = {
  id: true,
  cliente_id: true,
  tatuador_id: true,
  data_hora: true,
  status: true,
  valor_total: true,
  valor_sinal: true,
  sinal_pago: true,
  pagamento_restante_presencial: true,
  waiver_signed: true,
  session_status: true,
  version: true,
} as const;

type ActorRole = 'cliente' | 'tatuador' | 'estudio';

type MoneyValue = { toString(): string } | number | string | null | undefined;

function toMoney(value: MoneyValue): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number(value.toFixed(2));
  }
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? Number(numeric.toFixed(2)) : 0;
}

function toAgendamento(row: {
  id: string;
  cliente_id: string;
  tatuador_id: string;
  data_hora: Date;
  status: Agendamento['status'];
  valor_total: MoneyValue;
  valor_sinal: MoneyValue;
  sinal_pago: boolean;
  pagamento_restante_presencial: boolean;
  waiver_signed: boolean;
  session_status: Agendamento['session_status'];
  version: number;
}): Agendamento {
  return {
    id: row.id,
    cliente_id: row.cliente_id,
    tatuador_id: row.tatuador_id,
    data_hora: row.data_hora.toISOString(),
    status: row.status,
    valor_total: toMoney(row.valor_total),
    valor_sinal: toMoney(row.valor_sinal),
    sinal_pago: row.sinal_pago,
    pagamento_restante_presencial: row.pagamento_restante_presencial,
    waiver_signed: row.waiver_signed,
    session_status: row.session_status,
    version: row.version,
  };
}

function scopeForRole(actorId: string, role: ActorRole) {
  if (role === 'cliente') {
    return { cliente_id: actorId };
  }
  if (role === 'tatuador') {
    return { tatuador_id: actorId };
  }
  return {
    OR: [{ tatuador_id: actorId }, { tatuador: { studio_id: actorId } }],
  };
}

export async function listAgendamentosForActor(input: {
  actorId: string;
  role: string;
}): Promise<Agendamento[]> {
  const role = input.role;
  if (role !== 'cliente' && role !== 'tatuador' && role !== 'estudio') {
    throw new AgendamentoQueryError(403, 'Acesso negado.');
  }

  const rows = await prisma.agendamento.findMany({
    where: {
      deleted_at: null,
      ...scopeForRole(input.actorId, role),
    },
    select: LIST_SELECT,
    orderBy: { data_hora: 'asc' },
    take: LIST_LIMIT,
  });

  return rows.map(toAgendamento);
}
