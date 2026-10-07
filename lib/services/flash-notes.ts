import { prisma } from '@/lib/prisma';
import { ChatError } from '@/lib/services/chat';
import type { FlashNoteDto } from '@/lib/types/chat';

const FLASH_NOTE_MAX_LENGTH = 80;
const FLASH_NOTE_TTL_MS = 24 * 60 * 60 * 1000;
const ACTIVE_NOTES_LIMIT = 80;

type FlashNoteRow = {
  id: string;
  userId: string;
  content: string;
  createdAt: Date;
  expiresAt: Date;
  ativa: boolean;
  user?: {
    id: string;
    nome: string | null;
    role: string;
    cidade: string | null;
    estado: string | null;
  } | null;
};

function authorName(nome: string | null, role: string): string {
  const trimmed = (nome ?? '').trim();
  return trimmed || (role === 'tatuador' ? 'Artista' : 'Cliente');
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
        role: row.user.role,
        initial: authorInitial(authorName(row.user.nome, row.user.role)),
        cidade: row.user.cidade,
        estado: row.user.estado,
      }
    : null;

  return {
    id: row.id,
    userId: row.userId,
    content: row.content,
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
        select: { id: true, nome: true, role: true, cidade: true, estado: true },
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
}): Promise<FlashNoteDto> {
  if (params.actorRole !== 'tatuador') {
    throw new ChatError(403, 'Apenas tatuadores podem publicar Flash Notes.');
  }

  const content = typeof params.content === 'string' ? params.content.trim() : '';
  if (!content) {
    throw new ChatError(400, 'O conteúdo da Flash Note não pode estar vazio.');
  }
  if (content.length > FLASH_NOTE_MAX_LENGTH) {
    throw new ChatError(400, `Flash Note deve ter no máximo ${FLASH_NOTE_MAX_LENGTH} caracteres.`);
  }

  const now = new Date();
  let expiresAt = new Date(now.getTime() + FLASH_NOTE_TTL_MS);
  if (typeof params.expiresAt === 'string' && params.expiresAt.trim()) {
    const parsed = new Date(params.expiresAt);
    if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= now.getTime()) {
      throw new ChatError(400, 'expiresAt inválido.');
    }
    expiresAt = parsed;
  }

  await prisma.flashNote.updateMany({
    where: { userId: params.actorId, ativa: true },
    data: { ativa: false },
  });

  const created = await prisma.flashNote.create({
    data: {
      userId: params.actorId,
      content,
      expiresAt,
      ativa: true,
    },
    include: {
      user: {
        select: { id: true, nome: true, role: true, cidade: true, estado: true },
      },
    },
  });

  return toFlashNoteDto(created);
}

export function isFlashNoteExpired(row: { expiresAt: Date; ativa: boolean }, now = new Date()) {
  return isExpired(row, now);
}
