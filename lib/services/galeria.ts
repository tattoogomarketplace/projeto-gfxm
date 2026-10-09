import { prisma } from '@/lib/prisma';
import {
  isPortfolioBodyPart,
  isPortfolioStyle,
  type PortfolioBodyPart,
  type PortfolioStyle,
} from '@/lib/portfolio-metadata';

export class GaleriaError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'GaleriaError';
  }
}

export type GaleriaArtist = {
  id: string;
  name: string;
  avatarUrl: string | null;
  initial: string;
  cidade: string | null;
  estado: string | null;
  studio: { id: string; name: string } | null;
};

export type GaleriaItem = {
  id: string;
  tatuadorId: string;
  imageUrl: string;
  style: string;
  bodyPart: string;
  sessionDuration: string;
  isHealed: boolean;
  createdAt: string;
  likesCount: number;
  descricao: string | null;
  artist: GaleriaArtist;
};

export type GaleriaFilters = {
  style?: PortfolioStyle;
  bodyPart?: PortfolioBodyPart;
  isHealed?: boolean;
  limit: number;
};

const MAX_LIMIT = 60;
const DEFAULT_LIMIT = 48;

function readFirst(value: string | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parseHealed(raw: string): boolean | undefined {
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === 'true' || normalized === '1' || normalized === 'healed' || normalized === 'cicatrizada') {
    return true;
  }
  if (
    normalized === 'false' ||
    normalized === '0' ||
    normalized === 'fresh' ||
    normalized === 'recem-feita' ||
    normalized === 'recém-feita'
  ) {
    return false;
  }
  throw new GaleriaError(400, 'Status de cicatrização inválido.');
}

function parseLimit(raw: string): number {
  if (!raw) return DEFAULT_LIMIT;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    throw new GaleriaError(400, 'Limite inválido.');
  }
  return Math.min(n, MAX_LIMIT);
}

function artistName(nome: string | null): string {
  const trimmed = (nome ?? '').trim();
  return trimmed || '';
}

function artistInitial(nome: string): string {
  const letter = nome.charAt(0);
  return letter ? letter.toUpperCase() : 'A';
}

export function parseGaleriaSearchParams(searchParams: URLSearchParams): GaleriaFilters {
  const styleRaw = readFirst(searchParams.get('style') ?? searchParams.get('estilo'));
  const bodyPartRaw = readFirst(searchParams.get('bodyPart') ?? searchParams.get('body_part'));
  const healedRaw = readFirst(
    searchParams.get('healed') ??
      searchParams.get('isHealed') ??
      searchParams.get('is_healed') ??
      searchParams.get('status') ??
      searchParams.get('healing')
  );
  const limitRaw = readFirst(searchParams.get('limit'));

  const style = isPortfolioStyle(styleRaw) ? styleRaw : undefined;
  const bodyPart = isPortfolioBodyPart(bodyPartRaw) ? bodyPartRaw : undefined;

  if (styleRaw && !style) {
    throw new GaleriaError(400, 'Estilo inválido.');
  }
  if (bodyPartRaw && !bodyPart) {
    throw new GaleriaError(400, 'Parte do corpo inválida.');
  }

  return {
    ...(style ? { style } : {}),
    ...(bodyPart ? { bodyPart } : {}),
    ...(healedRaw ? { isHealed: parseHealed(healedRaw) } : {}),
    limit: parseLimit(limitRaw),
  };
}

export async function listGaleriaInspiracoes(filters: GaleriaFilters): Promise<GaleriaItem[]> {
  const rows = await prisma.portfolio.findMany({
    where: {
      deleted_at: null,
      ...(filters.style ? { estilo: filters.style } : {}),
      ...(filters.bodyPart ? { body_part: filters.bodyPart } : {}),
      ...(typeof filters.isHealed === 'boolean' ? { is_healed: filters.isHealed } : {}),
      tatuador: {
        deleted_at: null,
        role: 'tatuador',
        kyc_status: 'aprovado',
        statusConta: 'ATIVO',
      },
    },
    select: {
      id: true,
      tatuador_id: true,
      url_imagem: true,
      estilo: true,
      body_part: true,
      session_duration: true,
      is_healed: true,
      descricao: true,
      likes_count: true,
      created_at: true,
      tatuador: {
        select: {
          id: true,
          nome: true,
          cidade: true,
          estado: true,
          studio: {
            select: {
              id: true,
              nome: true,
            },
          },
        },
      },
    },
    orderBy: { created_at: 'desc' },
    take: filters.limit,
  });

  return rows.map((row) => {
    const name = artistName(row.tatuador.nome);
    const studioName = (row.tatuador.studio?.nome ?? '').trim();
    return {
      id: row.id,
      tatuadorId: row.tatuador_id,
      imageUrl: row.url_imagem,
      style: row.estilo,
      bodyPart: row.body_part,
      sessionDuration: row.session_duration,
      isHealed: row.is_healed,
      createdAt: row.created_at.toISOString(),
      likesCount: row.likes_count,
      descricao: row.descricao,
      artist: {
        id: row.tatuador.id,
        name,
        avatarUrl: null,
        initial: artistInitial(name),
        cidade: row.tatuador.cidade,
        estado: row.tatuador.estado,
        studio: row.tatuador.studio
          ? { id: row.tatuador.studio.id, name: studioName || '' }
          : null,
      },
    };
  });
}
