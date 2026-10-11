import { prisma } from '@/lib/prisma';
import { maskCnpj } from '@/lib/utils/cnpj';
import type { StudioArtistRow, StudioCard, StudioComplianceView } from '@/lib/types/studio-affiliation';

export type { StudioArtistRow, StudioCard, StudioComplianceView };

const CONVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export class AffiliationError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AffiliationError';
    this.status = status;
  }
}

type EstudioRow = {
  id: string;
  nome: string | null;
  cidade: string | null;
  estado: string | null;
  kyc_status: string;
  estudioCompliance: {
    razao_social: string | null;
    cnpj: string;
    status_receita: string;
  } | null;
};

function isVerifiedStudio(row: Pick<EstudioRow, 'kyc_status' | 'estudioCompliance'>): boolean {
  if (row.kyc_status === 'aprovado') return true;
  const status = row.estudioCompliance?.status_receita?.toLowerCase() ?? '';
  return status.includes('ativ');
}

function toStudioCard(row: EstudioRow): StudioCard {
  const razaoSocial = row.estudioCompliance?.razao_social ?? null;
  return {
    id: row.id,
    nome: row.nome || razaoSocial || '',
    cidade: row.cidade,
    estado: row.estado,
    razaoSocial,
    cnpjMasked: maskCnpj(row.estudioCompliance?.cnpj),
    verified: isVerifiedStudio(row),
  };
}

const ESTUDIO_SELECT = {
  id: true,
  nome: true,
  cidade: true,
  estado: true,
  kyc_status: true,
  estudioCompliance: {
    select: { razao_social: true, cnpj: true, status_receita: true },
  },
} as const;

async function expireStaleInvites(): Promise<void> {
  await prisma.estudioConvite.updateMany({
    where: {
      status: 'pendente',
      expires_at: { lte: new Date() },
      deleted_at: null,
    },
    data: { status: 'expirado' },
  });
}

export async function searchVerifiedStudios(query: string): Promise<StudioCard[]> {
  const q = query.trim().slice(0, 80);
  const rows = await prisma.perfil.findMany({
    where: {
      role: 'estudio',
      deleted_at: null,
      AND: [
        {
          OR: [
            { kyc_status: 'aprovado' },
            {
              estudioCompliance: {
                is: {
                  deleted_at: null,
                  status_receita: { contains: 'ativ', mode: 'insensitive' },
                },
              },
            },
          ],
        },
        ...(q
          ? [
              {
                OR: [
                  { nome: { contains: q, mode: 'insensitive' as const } },
                  { cidade: { contains: q, mode: 'insensitive' as const } },
                  { estado: { contains: q, mode: 'insensitive' as const } },
                  {
                    estudioCompliance: {
                      is: {
                        razao_social: { contains: q, mode: 'insensitive' as const },
                      },
                    },
                  },
                ],
              },
            ]
          : []),
      ],
    },
    select: ESTUDIO_SELECT,
    orderBy: { nome: 'asc' },
    take: 20,
  });

  return rows.filter(isVerifiedStudio).map(toStudioCard);
}

export async function requestAffiliation(tatuadorId: string, estudioId: string) {
  if (!isUuid(estudioId)) {
    throw new AffiliationError('Estúdio inválido.', 400);
  }

  const [tatuador, estudio] = await Promise.all([
    prisma.perfil.findFirst({
      where: { id: tatuadorId, deleted_at: null, role: 'tatuador' },
      select: { id: true, studio_id: true },
    }),
    prisma.perfil.findFirst({
      where: { id: estudioId, deleted_at: null, role: 'estudio' },
      select: ESTUDIO_SELECT,
    }),
  ]);

  if (!tatuador) {
    throw new AffiliationError('Perfil de tatuador não encontrado.', 404);
  }
  if (!estudio || !isVerifiedStudio(estudio)) {
    throw new AffiliationError('Estúdio não encontrado ou ainda não verificado.', 404);
  }
  if (tatuador.studio_id) {
    throw new AffiliationError('Você já está vinculado a um estúdio.', 409);
  }

  const vinculo = await prisma.estudioTatuador.findFirst({
    where: {
      tatuador_id: tatuador.id,
      status_vinculo: 'ativo',
      deleted_at: null,
    },
    select: { estudio_id: true },
  });
  if (vinculo) {
    throw new AffiliationError('Você já está vinculado a um estúdio.', 409);
  }

  await expireStaleInvites();

  const existing = await prisma.estudioConvite.findFirst({
    where: {
      estudio_id: estudio.id,
      tatuador_id: tatuador.id,
      status: 'pendente',
      deleted_at: null,
    },
    select: { id: true, expires_at: true },
  });
  if (existing) {
    return { convite_id: existing.id, expires_at: existing.expires_at, reused: true };
  }

  const convite = await prisma.estudioConvite.create({
    data: {
      estudio_id: estudio.id,
      tatuador_id: tatuador.id,
      status: 'pendente',
      expires_at: new Date(Date.now() + CONVITE_TTL_MS),
    },
    select: { id: true, expires_at: true },
  });

  return { convite_id: convite.id, expires_at: convite.expires_at, reused: false };
}

export async function listForTatuador(tatuadorId: string) {
  await expireStaleInvites();

  const tatuador = await prisma.perfil.findFirst({
    where: { id: tatuadorId, deleted_at: null },
    select: {
      studio: { select: ESTUDIO_SELECT },
    },
  });

  const pedidos = await prisma.estudioConvite.findMany({
    where: { tatuador_id: tatuadorId, deleted_at: null },
    select: {
      id: true,
      status: true,
      expires_at: true,
      created_at: true,
      estudio: { select: ESTUDIO_SELECT },
    },
    orderBy: { created_at: 'desc' },
    take: 30,
  });

  return {
    vinculo: tatuador?.studio ? toStudioCard(tatuador.studio) : null,
    pedidos: pedidos.map((item) => ({
      id: item.id,
      status: item.status,
      expires_at: item.expires_at.toISOString(),
      created_at: item.created_at.toISOString(),
      estudio: toStudioCard(item.estudio),
    })),
  };
}

export async function listForEstudio(estudioId: string) {
  await expireStaleInvites();

  const [pedidos, artistas] = await Promise.all([
    prisma.estudioConvite.findMany({
      where: { estudio_id: estudioId, deleted_at: null },
      select: {
        id: true,
        status: true,
        expires_at: true,
        created_at: true,
        tatuador: {
          select: {
            id: true,
            nome: true,
            cidade: true,
            estado: true,
            kyc_status: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    }),
    prisma.estudioTatuador.findMany({
      where: { estudio_id: estudioId, status_vinculo: 'ativo', deleted_at: null },
      select: {
        tatuador: {
          select: {
            id: true,
            nome: true,
            cidade: true,
            estado: true,
            kyc_status: true,
          },
        },
      },
      take: 100,
    }),
  ]);

  return {
    pendentes: pedidos.filter((item) => item.status === 'pendente'),
    pedidos,
    artistas: artistas.map(
      (item): StudioArtistRow => ({
        id: item.tatuador.id,
        nome: item.tatuador.nome || '',
        cidade: item.tatuador.cidade,
        estado: item.tatuador.estado,
        kyc_status: item.tatuador.kyc_status,
      })
    ),
  };
}

export async function decideAffiliation(
  actor: { id: string; role: string },
  conviteId: string,
  action: 'accept' | 'reject' | 'cancel'
) {
  if (!isUuid(conviteId)) {
    throw new AffiliationError('Pedido inválido.', 400);
  }

  await expireStaleInvites();

  return prisma.$transaction(async (tx) => {
    const convite = await tx.estudioConvite.findFirst({
      where: { id: conviteId, deleted_at: null },
    });
    if (!convite) {
      throw new AffiliationError('Pedido não encontrado.', 404);
    }
    if (convite.status !== 'pendente') {
      throw new AffiliationError('Pedido não está mais pendente.', 409);
    }

    const isStudio = actor.role === 'estudio' && convite.estudio_id === actor.id;
    const isArtist = actor.role === 'tatuador' && convite.tatuador_id === actor.id;

    if (action === 'cancel') {
      if (!isArtist) {
        throw new AffiliationError('Apenas o artista pode cancelar este pedido.', 403);
      }
      const canceled = await tx.estudioConvite.update({
        where: { id: convite.id },
        data: { status: 'recusado' },
      });
      return { status: canceled.status };
    }

    if (!isStudio) {
      throw new AffiliationError('Apenas o estúdio destino pode decidir este pedido.', 403);
    }

    if (action === 'reject') {
      const rejected = await tx.estudioConvite.update({
        where: { id: convite.id },
        data: { status: 'recusado' },
      });
      return { status: rejected.status };
    }

    const tatuador = await tx.perfil.findFirst({
      where: { id: convite.tatuador_id, deleted_at: null },
      select: { id: true, studio_id: true, role: true },
    });
    if (!tatuador || tatuador.role !== 'tatuador') {
      throw new AffiliationError('Tatuador não encontrado.', 404);
    }
    if (tatuador.studio_id && tatuador.studio_id !== convite.estudio_id) {
      throw new AffiliationError('Tatuador já vinculado a outro estúdio.', 409);
    }

    await tx.perfil.update({
      where: { id: tatuador.id },
      data: { studio_id: convite.estudio_id },
    });

    await tx.estudioTatuador.upsert({
      where: {
        estudio_id_tatuador_id: {
          estudio_id: convite.estudio_id,
          tatuador_id: tatuador.id,
        },
      },
      update: { status_vinculo: 'ativo', deleted_at: null },
      create: {
        estudio_id: convite.estudio_id,
        tatuador_id: tatuador.id,
        status_vinculo: 'ativo',
      },
    });

    await tx.estudioConvite.updateMany({
      where: {
        tatuador_id: tatuador.id,
        status: 'pendente',
        id: { not: convite.id },
        deleted_at: null,
      },
      data: { status: 'expirado' },
    });

    const accepted = await tx.estudioConvite.update({
      where: { id: convite.id },
      data: { status: 'aceito', accepted_at: new Date() },
    });

    return { status: accepted.status, studio_id: convite.estudio_id };
  });
}

export async function getStudioCompliance(estudioId: string) {
  const compliance = await prisma.estudioCompliance.findFirst({
    where: { id: estudioId, deleted_at: null },
    select: {
      cnpj: true,
      razao_social: true,
      endereco_oficial: true,
      status_receita: true,
      updated_at: true,
    },
  });
  if (!compliance) return null;
  const view: NonNullable<StudioComplianceView> = {
    cnpjMasked: maskCnpj(compliance.cnpj),
    razaoSocial: compliance.razao_social,
    enderecoOficial: compliance.endereco_oficial,
    statusReceita: compliance.status_receita,
    updatedAt: compliance.updated_at.toISOString(),
  };
  return view;
}
