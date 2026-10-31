import { prisma } from '@/lib/prisma';
import { ChatError } from '@/lib/services/chat';
import { MediaSecurityError, verifyPersistedImage } from '@/lib/security/media-persistence';
import {
  FLASH_NOTE_MAX_LENGTH,
  sanitizeFlashNoteStyle,
} from '@/lib/flash-notes-style';
import {
  normalizeFlashNoteDiscount,
  normalizeFlashNotePrice,
  resolveFlashNoteSalePrice,
} from '@/lib/flash-note-offer';
import type { FlashNoteDto } from '@/lib/types/chat';

const FLASH_NOTE_TTL_MS = 24 * 60 * 60 * 1000;
const ACTIVE_NOTES_LIMIT = 80;
const FLASH_NOTE_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const FLASH_NOTE_AUTHOR_SELECT = {
  id: true,
  nome: true,
  username: true,
  role: true,
  cidade: true,
  estado: true,
  portfolios: {
    where: { deleted_at: null },
    orderBy: { created_at: 'desc' as const },
    take: 1,
    select: { url_imagem: true },
  },
} as const;

type FlashNoteRow = {
  id: string;
  userId: string;
  content: string;
  backgroundId: string;
  fontClass: string;
  alignClass: string;
  price: { toNumber?: () => number } | number | string;
  discountPercentage: number | null;
  imageUrl: string | null;
  createdAt: Date;
  expiresAt: Date;
  ativa: boolean;
  user?: {
    id: string;
    nome: string | null;
    username: string | null;
    role: string;
    cidade: string | null;
    estado: string | null;
    portfolios?: { url_imagem: string | null }[];
  } | null;
};

function authorAvatarUrl(portfolios?: { url_imagem: string | null }[] | null): string | null {
  const url = portfolios?.[0]?.url_imagem?.trim();
  return url || null;
}

function authorName(nome: string | null, role: string): string {
  void role;
  const trimmed = (nome ?? '').trim();
  return trimmed;
}

function authorInitial(name: string): string {
  const letter = name.charAt(0);
  return letter ? letter.toUpperCase() : 'A';
}

export function toFlashNoteDto(row: FlashNoteRow): FlashNoteDto {
  const author = row.user
    ? {
        id: row.user.id,
        name: authorName(row.user.nome, row.user.role),
        username: row.user.username?.trim() || null,
        role: row.user.role,
        initial: authorInitial(authorName(row.user.nome, row.user.role)),
        cidade: row.user.cidade,
        estado: row.user.estado,
        avatarUrl: authorAvatarUrl(row.user.portfolios),
      }
    : null;

  const pricing = resolveFlashNoteSalePrice(row.price, row.discountPercentage);

  return {
    id: row.id,
    userId: row.userId,
    content: row.content,
    backgroundId: row.backgroundId,
    fontClass: row.fontClass,
    alignClass: row.alignClass,
    price: pricing?.originalPrice ?? 0,
    discountPercentage: pricing?.discountPercent ?? null,
    salePrice: pricing?.salePrice ?? null,
    imageUrl: row.imageUrl?.trim() || null,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    ativa: row.ativa,
    author,
  };
}

function isExpired(row: { expiresAt: Date; ativa: boolean }, now: Date): boolean {
  return !row.ativa || row.expiresAt.getTime() <= now.getTime();
}

export async function expireStaleFlashNotes(now = new Date()): Promise<void> {
  await prisma.flashNote.updateMany({
    where: {
      ativa: true,
      expiresAt: { lte: now },
    },
    data: { ativa: false },
  });
}

export async function listActiveFlashNotes(userId?: string): Promise<FlashNoteDto[]> {
  const now = new Date();
  await expireStaleFlashNotes(now);

  const rows = await prisma.flashNote.findMany({
    where: {
      ativa: true,
      expiresAt: { gt: now },
      ...(userId ? { userId } : {}),
      user: {
        deleted_at: null,
        statusConta: 'ATIVO',
      },
    },
    orderBy: { createdAt: 'desc' },
    take: ACTIVE_NOTES_LIMIT,
    include: {
      user: {
        select: FLASH_NOTE_AUTHOR_SELECT,
      },
    },
  });

  return rows.map(toFlashNoteDto);
}

export async function createFlashNote(params: {
  actorId: string;
  actorRole: string;
  content: unknown;
  expiresAt?: unknown;
  backgroundId?: unknown;
  fontClass?: unknown;
  alignClass?: unknown;
  price?: unknown;
  discountPercentage?: unknown;
  imageUrl?: unknown;
  ownerIds?: readonly string[];
}): Promise<FlashNoteDto> {
  if (params.actorRole !== 'tatuador') {
    throw new ChatError(403, 'Apenas tatuadores podem publicar Flash Notes.');
  }

  const content = normalizeContent(params.content);

  const now = new Date();
  let expiresAt = new Date(now.getTime() + FLASH_NOTE_TTL_MS);
  if (typeof params.expiresAt === 'string' && params.expiresAt.trim()) {
    const parsed = new Date(params.expiresAt);
    if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= now.getTime()) {
      throw new ChatError(400, 'expiresAt inválido.');
    }
    expiresAt = parsed;
  }

  const style = sanitizeFlashNoteStyle(params);
  const pricing = requireFlashNotePricing(params.price, params.discountPercentage);
  const imageUrl = await verifyFlashNoteImage(params.imageUrl, params.ownerIds ?? [params.actorId]);

  await prisma.flashNote.updateMany({
    where: { userId: params.actorId, ativa: true },
    data: { ativa: false },
  });

  const created = await prisma.flashNote.create({
    data: {
      userId: params.actorId,
      content,
      backgroundId: style.backgroundId,
      fontClass: style.fontClass,
      alignClass: style.alignClass,
      price: pricing.originalPrice,
      discountPercentage: pricing.discountPercent,
      imageUrl,
      expiresAt,
      ativa: true,
    },
    include: {
      user: {
        select: FLASH_NOTE_AUTHOR_SELECT,
      },
    },
  });

  return toFlashNoteDto(created);
}

export async function updateFlashNote(params: {
  actorId: string;
  noteId: string;
  content?: unknown;
  backgroundId?: unknown;
  fontClass?: unknown;
  alignClass?: unknown;
  price?: unknown;
  discountPercentage?: unknown;
  imageUrl?: unknown;
  ownerIds?: readonly string[];
}): Promise<FlashNoteDto> {
  if (!FLASH_NOTE_ID_RE.test(params.noteId)) {
    throw new ChatError(404, 'Flash Note não encontrada.');
  }

  const existing = await prisma.flashNote.findFirst({
    where: { id: params.noteId, userId: params.actorId },
    select: {
      id: true,
      userId: true,
      content: true,
      backgroundId: true,
      fontClass: true,
      alignClass: true,
      price: true,
      discountPercentage: true,
      imageUrl: true,
    },
  });

  if (!existing) {
    throw new ChatError(404, 'Flash Note não encontrada.');
  }

  const content =
    params.content === undefined ? existing.content : normalizeContent(params.content);

  const style = sanitizeFlashNoteStyle({
    backgroundId: params.backgroundId ?? existing.backgroundId,
    fontClass: params.fontClass ?? existing.fontClass,
    alignClass: params.alignClass ?? existing.alignClass,
  });
  const pricing = requireFlashNotePricing(
    params.price ?? existing.price,
    params.discountPercentage === undefined ? existing.discountPercentage : params.discountPercentage
  );
  const imageUrl =
    params.imageUrl === undefined
      ? requireFlashNoteImageUrl(existing.imageUrl)
      : await verifyFlashNoteImage(params.imageUrl, params.ownerIds ?? [params.actorId]);

  const mutated = await prisma.flashNote.updateMany({
    where: { id: existing.id, userId: params.actorId },
    data: {
      content,
      backgroundId: style.backgroundId,
      fontClass: style.fontClass,
      alignClass: style.alignClass,
      price: pricing.originalPrice,
      discountPercentage: pricing.discountPercent,
      imageUrl,
      expiresAt: new Date(Date.now() + FLASH_NOTE_TTL_MS),
    },
  });
  if (mutated.count === 0) {
    throw new ChatError(404, 'Flash Note não encontrada.');
  }

  const updated = await prisma.flashNote.findFirst({
    where: { id: existing.id, userId: params.actorId },
    include: {
      user: {
        select: FLASH_NOTE_AUTHOR_SELECT,
      },
    },
  });
  if (!updated) {
    throw new ChatError(404, 'Flash Note não encontrada.');
  }

  return toFlashNoteDto(updated);
}

function normalizeContent(value: unknown): string {
  const content = typeof value === 'string' ? value.trim() : '';
  if (!content) {
    throw new ChatError(400, 'O conteúdo da Flash Note não pode estar vazio.');
  }
  if (content.length > FLASH_NOTE_MAX_LENGTH) {
    throw new ChatError(400, `Flash Note deve ter no máximo ${FLASH_NOTE_MAX_LENGTH} caracteres.`);
  }
  return content;
}

function requireFlashNoteImageUrl(value: unknown): string {
  const imageUrl = typeof value === 'string' ? value.trim() : '';
  if (!imageUrl) {
    throw new ChatError(400, 'A Flash Note precisa de uma imagem 9:16.');
  }
  try {
    const parsed = new URL(imageUrl);
    if (parsed.protocol !== 'https:') {
      throw new ChatError(400, 'A URL da imagem deve ser HTTPS.');
    }
  } catch (error) {
    if (error instanceof ChatError) throw error;
    throw new ChatError(400, 'URL da imagem inválida.');
  }
  if (imageUrl.length > 1024) {
    throw new ChatError(400, 'URL da imagem excede o tamanho máximo.');
  }
  return imageUrl;
}

/**
 * Fase 2 — valida host-binding (R2_PUBLIC_URL), context `flash-notes`,
 * ownership da chave e Magic Bytes antes de gravar `imageUrl`. Objetos cujo
 * conteúdo não é uma imagem segura são apagados do bucket.
 */
async function verifyFlashNoteImage(
  value: unknown,
  ownerIds: readonly string[]
): Promise<string> {
  const imageUrl = requireFlashNoteImageUrl(value);
  try {
    const verified = await verifyPersistedImage({
      imageUrl,
      context: 'flash-notes',
      ownerIds,
    });
    return verified.imageUrl;
  } catch (error) {
    if (error instanceof MediaSecurityError) {
      throw new ChatError(error.status, error.message);
    }
    throw error;
  }
}

function requireFlashNotePricing(price: unknown, discountPercentage: unknown) {
  if (normalizeFlashNotePrice(price) == null) {
    throw new ChatError(400, 'Informe um valor valido para a Flash Note.');
  }
  if (
    discountPercentage != null &&
    discountPercentage !== '' &&
    normalizeFlashNoteDiscount(discountPercentage) == null
  ) {
    throw new ChatError(400, 'Desconto invalido. Use um percentual de 1 a 99.');
  }
  const pricing = resolveFlashNoteSalePrice(price, discountPercentage);
  if (!pricing) {
    throw new ChatError(400, 'Informe um valor valido para a Flash Note.');
  }
  return pricing;
}

export function isFlashNoteExpired(row: { expiresAt: Date; ativa: boolean }, now = new Date()) {
  return isExpired(row, now);
}

export async function deleteFlashNote(params: {
  actorId: string;
  noteId: string;
}): Promise<void> {
  if (!FLASH_NOTE_ID_RE.test(params.noteId)) {
    throw new ChatError(404, 'Flash Note não encontrada.');
  }

  const mutated = await prisma.flashNote.updateMany({
    where: { id: params.noteId, userId: params.actorId },
    data: { ativa: false },
  });
  if (mutated.count === 0) {
    throw new ChatError(404, 'Flash Note não encontrada.');
  }
}