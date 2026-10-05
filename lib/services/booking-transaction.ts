import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { isDateWithinWorkingHours, normalizeWorkingHours } from '@/lib/working-hours';

export const MUTEX_MINUTOS = 10;
export const CALCAO_PERCENTUAL = 0.25;

const ACTIVE_BOOKING_STATUSES = ['aguardando_sinal', 'confirmado'] as const;
const MAX_SERIALIZATION_RETRIES = 3;
const HEALTH_TERMS = /\b(pomada|anestesia|anestesico|anest[eé]sico|tktx|lidoca[ií]na|emla|numbing)\b/i;

export class BookingError extends Error {
  status: number;
  bloqueado?: boolean;

  constructor(status: number, message: string, extra?: { bloqueado?: boolean }) {
    super(message);
    this.status = status;
    this.name = 'BookingError';
    this.bloqueado = extra?.bloqueado;
  }
}

type ExtraInput = {
  descricao?: unknown;
  valor?: unknown;
};

type BookingInput = {
  clienteId: string;
  tatuadorId: string;
  dataHora: string;
  valorTotal: unknown;
  extras?: ExtraInput[];
};

type SanitizedExtra = {
  descricao: string;
  valor: number;
};

function detectarTermoSaude(texto: string): string | null {
  const match = texto.match(HEALTH_TERMS);
  return match ? match[0] : null;
}

function sanitizarExtras(extras: ExtraInput[] | undefined): {
  extrasLegais: SanitizedExtra[];
  bloqueios: Array<{ original: string; termo: string; rotulo_legal: string }>;
} {
  if (!Array.isArray(extras)) return { extrasLegais: [], bloqueios: [] };

  const extrasLegais: SanitizedExtra[] = [];
  const bloqueios: Array<{ original: string; termo: string; rotulo_legal: string }> = [];

  for (const extra of extras) {
    const descricao = typeof extra?.descricao === 'string' ? extra.descricao : '';
    const valor = Number(extra?.valor || 0);
    const termo = detectarTermoSaude(descricao);
    if (termo) {
      const normalizado = termo.toLowerCase();
      const rotulo =
        /tktx|anest|lidoc|emla|numbing/.test(normalizado) ? 'Sessao Sem Dor' : 'Taxa de Conforto';
      bloqueios.push({ original: descricao, termo, rotulo_legal: rotulo });
      extrasLegais.push({ descricao: rotulo, valor: valor > 0 ? valor : 0 });
    } else if (descricao.trim()) {
      extrasLegais.push({ descricao: descricao.trim(), valor: valor > 0 ? valor : 0 });
    }
  }

  return { extrasLegais, bloqueios };
}

function normalizeSlot(date: Date): Date {
  const slot = new Date(date);
  slot.setSeconds(0, 0);
  return slot;
}

function isPrismaKnown(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

async function logCompliance(userId: string, termoDetectado: string, acaoTomada: string) {
  try {
    await prisma.complianceLog.create({
      data: {
        user_id: userId,
        termo_detectado: termoDetectado,
        acao_tomada: acaoTomada,
      },
    });
  } catch {
    return;
  }
}

async function lockSlotRows(
  tx: Prisma.TransactionClient,
  tatuadorId: string,
  slot: Date
): Promise<Array<{ id: string }>> {
  return tx.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM agendamentos
    WHERE tatuador_id = ${tatuadorId}::uuid
      AND data_hora = ${slot}
      AND deleted_at IS NULL
      AND status::text IN ('aguardando_sinal', 'confirmado')
    FOR UPDATE
  `;
}

async function lockArtistSchedule(
  tx: Prisma.TransactionClient,
  tatuadorId: string
): Promise<{ schedule_json: Prisma.JsonValue } | null> {
  const rows = await tx.$queryRaw<Array<{ schedule_json: Prisma.JsonValue }>>`
    SELECT schedule_json
    FROM artist_schedules
    WHERE tatuador_id = ${tatuadorId}::uuid
    FOR UPDATE
  `;
  return rows[0] ?? null;
}

async function criarAgendamentoAtomicoOnce(input: BookingInput) {
  if (!input.tatuadorId || !input.dataHora || input.valorTotal === undefined || input.valorTotal === null) {
    throw new BookingError(400, 'tatuador_id, data_hora e valor_total sao obrigatorios.');
  }

  const slot = normalizeSlot(new Date(input.dataHora));
  if (Number.isNaN(slot.getTime()) || slot.getTime() <= Date.now()) {
    throw new BookingError(400, 'Horario de agendamento invalido.');
  }

  const valor = Number(input.valorTotal);
  if (!(valor > 0)) {
    throw new BookingError(400, 'Valor do servico deve ser positivo.');
  }

  if (detectarTermoSaude(String(input.valorTotal)) || detectarTermoSaude(String(input.dataHora))) {
    throw new BookingError(403, 'Termo juridicamente restrito detectado na requisicao.');
  }

  const { extrasLegais, bloqueios } = sanitizarExtras(input.extras);
  if (bloqueios.length) {
    await logCompliance(
      input.clienteId,
      bloqueios.map((item) => item.original).join(' | '),
      'renomeacao_legal_taxa_conforto_sessao_sem_dor'
    );
  }

  const valorSinal = Number((valor * CALCAO_PERCENTUAL).toFixed(2));
  const mutexExpiraEm = new Date(Date.now() + MUTEX_MINUTOS * 60 * 1000);

  const agendamento = await prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`
        SELECT pg_advisory_xact_lock(
          hashtext(${input.tatuadorId}::text),
          hashtext(${slot.toISOString()}::text)
        )
      `;

      const agora = new Date();
      await tx.agendamento.updateMany({
        where: {
          tatuador_id: input.tatuadorId,
          data_hora: slot,
          status: 'aguardando_sinal',
          sinal_pago: false,
          mutex_expira_em: { lte: agora },
          deleted_at: null,
        },
        data: {
          status: 'cancelado',
          deleted_at: agora,
        },
      });

      const tatuadorRows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM perfis
        WHERE id = ${input.tatuadorId}::uuid
          AND deleted_at IS NULL
          AND role::text = 'tatuador'
          AND kyc_status::text = 'aprovado'
          AND agenda_bloqueada = false
        FOR UPDATE
      `;
      if (!tatuadorRows[0]) {
        throw new BookingError(403, 'Tatuador indisponivel para agendamento.');
      }

      const scheduleRow = await lockArtistSchedule(tx, input.tatuadorId);
      if (scheduleRow?.schedule_json) {
        const schedule = normalizeWorkingHours(scheduleRow.schedule_json);
        if (!isDateWithinWorkingHours(schedule, slot)) {
          throw new BookingError(409, 'Horario fora do expediente do tatuador.');
        }
      }

      const lockedConflicts = await lockSlotRows(tx, input.tatuadorId, slot);
      if (lockedConflicts.length > 0) {
        throw new BookingError(
          409,
          'Horario em mutex. Outro cliente esta concluindo o calcão deste slot.'
        );
      }

      const conflito = await tx.agendamento.findFirst({
        where: {
          tatuador_id: input.tatuadorId,
          data_hora: slot,
          deleted_at: null,
          status: { in: [...ACTIVE_BOOKING_STATUSES] },
        },
        select: { id: true },
      });
      if (conflito) {
        throw new BookingError(
          409,
          'Horario em mutex. Outro cliente esta concluindo o calcão deste slot.'
        );
      }

      return tx.agendamento.create({
        data: {
          cliente_id: input.clienteId,
          tatuador_id: input.tatuadorId,
          data_hora: slot,
          status: 'aguardando_sinal',
          valor_total: new Prisma.Decimal(valor.toFixed(2)),
          valor_sinal: new Prisma.Decimal(valorSinal.toFixed(2)),
          sinal_pago: false,
          mutex_expira_em: mutexExpiraEm,
          extras: {
            create: extrasLegais.map((extra) => ({
              descricao: extra.descricao,
              valor: new Prisma.Decimal(Number(extra.valor || 0).toFixed(2)),
            })),
          },
        },
        include: { extras: true },
      });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 15000,
    }
  );

  return {
    sucesso: true as const,
    agendamento,
    calcao: {
      percentual: 25,
      valor: valorSinal,
      mutex_expira_em: mutexExpiraEm,
      extras_legais: extrasLegais,
      extras_renomeados: bloqueios,
    },
  };
}

export async function criarAgendamentoAtomico(input: BookingInput) {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_SERIALIZATION_RETRIES; attempt += 1) {
    try {
      return await criarAgendamentoAtomicoOnce(input);
    } catch (error) {
      lastError = error;
      if (error instanceof BookingError) throw error;
      if (isPrismaKnown(error) && error.code === 'P2002') {
        throw new BookingError(409, 'Horario ja reservado para este tatuador.');
      }
      const retryable = isPrismaKnown(error) && (error.code === 'P2034' || error.code === 'P2028');
      if (retryable && attempt < MAX_SERIALIZATION_RETRIES - 1) continue;
      if (retryable) {
        throw new BookingError(409, 'Horario ja reservado para este tatuador.');
      }
      throw error;
    }
  }
  throw lastError;
}
