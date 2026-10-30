import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/**
 * Resolução server-side do preço oficial de um serviço (G-9).
 *
 * Regra de ouro: o cliente envia apenas `servico_id`. O valor monetário é
 * SEMPRE lido da tabela `servicos` — nunca do corpo da requisição. Qualquer
 * `valor_total` enviado pelo cliente é descartado por completo.
 *
 * A consulta exige que o serviço pertença ao tatuador do agendamento, esteja
 * ativo e não excluído. Isso impede que um cliente referencie o serviço de
 * outro profissional (ou um serviço desativado) para manipular o preço.
 */

export class ServicoPricingError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ServicoPricingError';
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ResolvedServico = {
  id: string;
  tatuadorId: string;
  nome: string;
  preco: number;
};

export function isServicoId(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value.trim());
}

function toNumber(value: unknown): number {
  if (value == null) return NaN;
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim()) return Number(value);
  if (
    typeof value === 'object' &&
    'toNumber' in value &&
    typeof (value as { toNumber?: unknown }).toNumber === 'function'
  ) {
    return Number((value as { toNumber: () => number }).toNumber());
  }
  return Number(value);
}

type ServicoLookupClient = Pick<Prisma.TransactionClient, 'servico'> | typeof prisma;

/**
 * Lê o preço oficial dentro de uma transação (preferido) ou do client global.
 * Retorna o valor em BRL com 2 casas, pronto para virar `Prisma.Decimal`.
 */
export async function resolveServicoPrice(
  client: ServicoLookupClient,
  servicoIdRaw: unknown,
  tatuadorIdRaw: unknown
): Promise<ResolvedServico> {
  const servicoId = typeof servicoIdRaw === 'string' ? servicoIdRaw.trim() : '';
  const tatuadorId = typeof tatuadorIdRaw === 'string' ? tatuadorIdRaw.trim() : '';

  if (!isServicoId(servicoId)) {
    throw new ServicoPricingError(400, 'servico_id obrigatorio e deve ser um UUID valido.');
  }
  if (!isServicoId(tatuadorId)) {
    throw new ServicoPricingError(400, 'tatuador_id invalido.');
  }

  const servico = await client.servico.findFirst({
    where: {
      id: servicoId,
      tatuador_id: tatuadorId,
      ativo: true,
      deleted_at: null,
    },
    select: { id: true, tatuador_id: true, nome: true, preco: true },
  });

  if (!servico) {
    throw new ServicoPricingError(
      404,
      'Servico indisponivel para este profissional.'
    );
  }

  const preco = toNumber(servico.preco);
  if (!Number.isFinite(preco) || preco <= 0) {
    throw new ServicoPricingError(409, 'Servico sem preco oficial valido.');
  }

  return {
    id: servico.id,
    tatuadorId: servico.tatuador_id,
    nome: servico.nome,
    preco: Number(preco.toFixed(2)),
  };
}
