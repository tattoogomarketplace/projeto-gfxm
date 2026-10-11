import { prisma } from '@/lib/prisma';
import { ChatError } from '@/lib/services/chat';
import {
  FLASH_NOTE_MAX_LENGTH,
  sanitizeFlashNoteStyle,
} from '@/lib/flash-notes-style';
import type { FlashNoteDto } from '@/lib/types/chat';

const FLASH_NOTE_TTL_MS = 24 * 60 * 60 * 1000;
const ACTIVE_NOTES_LIMIT = 80;
const FLASH_NOTE_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type FlashNoteRow = {
  id: string;
  userId: string;
  content: string;
  backgroundId: string;
  fontClass: string;
  alignClass: string;
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
    backgroundId: row.backgroundId,
    fontClass: row.fontClass,
    alignClass: row.alignClass,
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
  backgroundId?: unknown;
  fontClass?: unknown;
  alignClass?: unknown;
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

export async function updateFlashNote(params: {
  actorId: string;
  noteId: string;
  content?: unknown;
  backgroundId?: unknown;
  fontClass?: unknown;
  alignClass?: unknown;
}): Promise<FlashNoteDto> {
  if (!FLASH_NOTE_ID_RE.test(params.noteId)) {
    throw new ChatError(404, 'Flash Note não encontrada.');
  }

  const existing = await prisma.flashNote.findUnique({
    where: { id: params.noteId },
    select: { id: true, userId: true, content: true, backgroundId: true, fontClass: true, alignClass: true },
  });

  if (!existing || existing.userId !== params.actorId) {
    throw new ChatError(404, 'Flash Note não encontrada.');
  }

  const content =
    params.content === undefined ? existing.content : normalizeContent(params.content);

  const style = sanitizeFlashNoteStyle({
    backgroundId: params.backgroundId ?? existing.backgroundId,
    fontClass: params.fontClass ?? existing.fontClass,
    alignClass: params.alignClass ?? existing.alignClass,
  });

  const updated = await prisma.flashNote.update({
    where: { id: existing.id },
    data: {
      content,
      backgroundId: style.backgroundId,
      fontClass: style.fontClass,
      alignClass: style.alignClass,
      expiresAt: new Date(Date.now() + FLASH_NOTE_TTL_MS),
    },
    include: {
      user: {
        select: { id: true, nome: true, role: true, cidade: true, estado: true },
      },
    },
  });

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

  const existing = await prisma.flashNote.findUnique({
    where: { id: params.noteId },
    select: { id: true, userId: true },
  });

  if (!existing || existing.userId !== params.actorId) {
    throw new ChatError(404, 'Flash Note não encontrada.');
  }

  await prisma.flashNote.update({
    where: { id: existing.id },
    data: { ativa: false },
  });
}