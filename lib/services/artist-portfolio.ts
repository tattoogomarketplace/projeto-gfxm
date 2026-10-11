import { prisma } from '@/lib/prisma';
import { moderatePortfolioImage, refineStudioCaption } from '@/lib/ai-moderation';
import {
  composeStudioCaption,
  isHttpsImageUrl,
  isPortfolioBodyPart,
  isPortfolioSessionDuration,
  isPortfolioStyle,
  resolvePortfolioLocation,
  sanitizePortfolioNotes,
  type PortfolioItemDto,
  type PortfolioPublishInput,
} from '@/lib/portfolio-metadata';

export class ArtistPortfolioError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ArtistPortfolioError';
  }
}

export type TatuadorActor = {
  id: string;
  role: string;
  deleted_at: Date | null;
};

type PortfolioRow = {
  id: string;
  tatuador_id: string;
  url_imagem: string;
  estilo: string;
  body_part: string;
  session_duration: string;
  is_healed: boolean;
  descricao: string | null;
  likes_count: number;
  created_at: Date;
  tatuador: {
    cidade: string | null;
    estado: string | null;
    studio: { cidade: string | null; estado: string | null } | null;
  };
};

export async function loadTatuadorActor(clerkId: string): Promise<TatuadorActor | null> {
  return prisma.perfil.findUnique({
    where: { clerk_id: clerkId },
    select: { id: true, role: true, deleted_at: true },
  });
}

export function assertTatuador(actor: TatuadorActor | null): TatuadorActor {
  if (!actor || actor.deleted_at) {
    throw new ArtistPortfolioError(404, 'Perfil não encontrado.');
  }
  if (actor.role !== 'tatuador') {
    throw new ArtistPortfolioError(
      403,
      'Apenas tatuadores podem publicar ou consultar o portfólio.'
    );
  }
  return actor;
}

export function toPortfolioItemDto(row: PortfolioRow): PortfolioItemDto {
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
    location: resolvePortfolioLocation({
      studioCity: row.tatuador?.studio?.cidade,
      studioState: row.tatuador?.studio?.estado,
      artistCity: row.tatuador?.cidade,
      artistState: row.tatuador?.estado,
    }),
  };
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return null;
}

export function parsePublishPayload(raw: unknown): PortfolioPublishInput {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ArtistPortfolioError(400, 'Payload inválido.');
  }

  const body = raw as Record<string, unknown>;
  const imageUrl = readString(body.imageUrl ?? body.url_imagem ?? body.image_url);
  const style = readString(body.style ?? body.estilo);
  const bodyPart = readString(body.bodyPart ?? body.body_part);
  const sessionDuration = readString(body.sessionDuration ?? body.session_duration);
  const healedRaw = body.isHealed ?? body.is_healed;
  const isHealed = readBoolean(healedRaw);

  const missing: string[] = [];
  if (!imageUrl) missing.push('imageUrl');
  if (!style) missing.push('style');
  if (!bodyPart) missing.push('bodyPart');
  if (!sessionDuration) missing.push('sessionDuration');
  if (isHealed === null) missing.push('isHealed');

  if (missing.length > 0 || isHealed === null) {
    throw new ArtistPortfolioError(
      400,
      `Campos obrigatórios ausentes: ${missing.join(', ') || 'isHealed'}.`
    );
  }

  if (!isHttpsImageUrl(imageUrl)) {
    throw new ArtistPortfolioError(400, 'imageUrl deve ser uma URL HTTPS válida.');
  }
  if (!isPortfolioStyle(style)) {
    throw new ArtistPortfolioError(400, 'Estilo inválido.');
  }
  if (!isPortfolioBodyPart(bodyPart)) {
    throw new ArtistPortfolioError(400, 'Parte do corpo inválida.');
  }
  if (!isPortfolioSessionDuration(sessionDuration)) {
    throw new ArtistPortfolioError(400, 'Duração da sessão inválida.');
  }

  const notes = sanitizePortfolioNotes(readString(body.notes ?? body.caption ?? body.descricao ?? body.description));

  return {
    imageUrl,
    style,
    bodyPart,
    sessionDuration,
    isHealed,
    ...(notes ? { notes } : {}),
  };
}

export type PortfolioUpdateInput = Omit<PortfolioPublishInput, 'imageUrl'>;

export function parseUpdatePayload(raw: unknown): PortfolioUpdateInput {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ArtistPortfolioError(400, 'Payload inválido.');
  }

  const body = raw as Record<string, unknown>;
  const style = readString(body.style ?? body.estilo);
  const bodyPart = readString(body.bodyPart ?? body.body_part);
  const sessionDuration = readString(body.sessionDuration ?? body.session_duration);
  const isHealed = readBoolean(body.isHealed ?? body.is_healed);

  const missing: string[] = [];
  if (!style) missing.push('style');
  if (!bodyPart) missing.push('bodyPart');
  if (!sessionDuration) missing.push('sessionDuration');
  if (isHealed === null) missing.push('isHealed');

  if (missing.length > 0 || isHealed === null) {
    throw new ArtistPortfolioError(
      400,
      `Campos obrigatórios ausentes: ${missing.join(', ') || 'isHealed'}.`
    );
  }
  if (!isPortfolioStyle(style)) {
    throw new ArtistPortfolioError(400, 'Estilo inválido.');
  }
  if (!isPortfolioBodyPart(bodyPart)) {
    throw new ArtistPortfolioError(400, 'Parte do corpo inválida.');
  }
  if (!isPortfolioSessionDuration(sessionDuration)) {
    throw new ArtistPortfolioError(400, 'Duração da sessão inválida.');
  }

  const notes = sanitizePortfolioNotes(
    readString(body.notes ?? body.caption ?? body.descricao ?? body.description)
  );

  return {
    style,
    bodyPart,
    sessionDuration,
    isHealed,
    ...(notes ? { notes } : {}),
  };
}

async function invalidatePortfolioFeed() {
  try {
    const { Redis } = await import('@upstash/redis');
    const redis = Redis.fromEnv();
    await redis.del('feed:portfolios:v2');
  } catch {
    void 0;
  }
}

async function findOwnedItem(tatuadorId: string, itemId: string) {
  const existing = await prisma.portfolio.findFirst({
    where: { id: itemId, tatuador_id: tatuadorId, deleted_at: null },
    select: { id: true },
  });
  if (!existing) {
    throw new ArtistPortfolioError(404, 'Obra não encontrada.');
  }
  return existing;
}

const ITEM_SELECT = {
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
      cidade: true,
      estado: true,
      studio: {
        select: {
          cidade: true,
          estado: true,
        },
      },
    },
  },
} as const;

export async function listArtistPortfolio(tatuadorId: string): Promise<PortfolioItemDto[]> {
  const rows = await prisma.portfolio.findMany({
    where: { tatuador_id: tatuadorId, deleted_at: null },
    select: ITEM_SELECT,
    orderBy: { created_at: 'desc' },
  });
  return rows.map(toPortfolioItemDto);
}

export async function publishArtistPortfolio(
  tatuadorId: string,
  raw: unknown
): Promise<PortfolioItemDto> {
  const payload = parsePublishPayload(raw);

  const moderation = await moderatePortfolioImage(payload.imageUrl);
  if (!moderation.allowed) {
    throw new ArtistPortfolioError(
      422,
      'A imagem foi recusada pela curadoria. Envie uma peça de tatuagem em padrão de studio.'
    );
  }

  const structuredCaption = composeStudioCaption({
    style: payload.style,
    bodyPart: payload.bodyPart,
    sessionDuration: payload.sessionDuration,
    isHealed: payload.isHealed,
    notes: payload.notes,
  });
  let descricao = structuredCaption;
  try {
    descricao = await refineStudioCaption(
      {
        style: payload.style,
        bodyPart: payload.bodyPart,
        sessionDuration: payload.sessionDuration,
        isHealed: payload.isHealed,
        notes: payload.notes,
      },
      structuredCaption
    );
  } catch (error) {
    console.warn('[artist-portfolio] legenda formal via Gemini indisponível; usando estrutura local.', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const created = await prisma.portfolio.create({
    data: {
      tatuador_id: tatuadorId,
      url_imagem: payload.imageUrl,
      estilo: payload.style,
      body_part: payload.bodyPart,
      session_duration: payload.sessionDuration,
      is_healed: payload.isHealed,
      descricao,
      likes_count: 0,
    },
    select: ITEM_SELECT,
  });

  await invalidatePortfolioFeed();

  return toPortfolioItemDto(created);
}

export async function updateArtistPortfolio(
  tatuadorId: string,
  itemId: string,
  raw: unknown
): Promise<PortfolioItemDto> {
  const payload = parseUpdatePayload(raw);
  await findOwnedItem(tatuadorId, itemId);

  const descricao = composeStudioCaption({
    style: payload.style,
    bodyPart: payload.bodyPart,
    sessionDuration: payload.sessionDuration,
    isHealed: payload.isHealed,
    notes: payload.notes,
  });

  const updated = await prisma.portfolio.update({
    where: { id: itemId },
    data: {
      estilo: payload.style,
      body_part: payload.bodyPart,
      session_duration: payload.sessionDuration,
      is_healed: payload.isHealed,
      descricao,
    },
    select: ITEM_SELECT,
  });

  await invalidatePortfolioFeed();
  return toPortfolioItemDto(updated);
}

export async function archiveArtistPortfolio(
  tatuadorId: string,
  itemId: string
): Promise<void> {
  await findOwnedItem(tatuadorId, itemId);
  await prisma.portfolio.update({
    where: { id: itemId },
    data: { deleted_at: new Date() },
  });
  await invalidatePortfolioFeed();
}
