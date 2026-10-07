import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolvePerfilSession } from '@/lib/services/perfil-session';
import { validateChatMessage } from '@/lib/utils/chat-moderation';
import type {
  ChatArtworkRef,
  ChatCategoria,
  ChatContextDto,
  ChatConversationDto,
  ChatMessageDto,
  ChatPeer,
  ChatTab,
} from '@/lib/types/chat';

export class ChatError extends Error {
  status: number;
  bloqueado?: boolean;

  constructor(status: number, message: string, bloqueado?: boolean) {
    super(message);
    this.status = status;
    this.name = 'ChatError';
    this.bloqueado = bloqueado;
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_MESSAGE_LENGTH = 1000;
const HISTORY_LIMIT = 200;
const CONVERSATION_SCAN_LIMIT = 400;

const BUDGET_CATEGORIES: ChatCategoria[] = ['BUDGET', 'ORCAMENTO'];

type ActorPerfil = {
  id: string;
  role: string;
  deleted_at: Date | null;
  nome: string | null;
  email: string;
};

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function escapeMessage(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function peerName(nome: string | null, fallback: string): string {
  const trimmed = (nome ?? '').trim();
  return trimmed || fallback;
}

function peerInitial(name: string): string {
  const letter = name.charAt(0);
  return letter ? letter.toUpperCase() : 'A';
}

function toPeer(row: {
  id: string;
  nome: string | null;
  role: string;
  cidade: string | null;
  estado: string | null;
}): ChatPeer {
  const name = peerName(row.nome, row.role === 'tatuador' ? 'Artista' : 'Cliente');
  return {
    id: row.id,
    name,
    role: row.role,
    initial: peerInitial(name),
    cidade: row.cidade,
    estado: row.estado,
  };
}

function toMessageDto(row: {
  id: string;
  remetente_id: string;
  destinatario_id: string;
  mensagem: string;
  bloqueada: boolean;
  status: string;
  categoria?: ChatCategoria | string | null;
  created_at: Date;
}): ChatMessageDto {
  return {
    id: row.id,
    remetente_id: row.remetente_id,
    destinatario_id: row.destinatario_id,
    mensagem: row.mensagem,
    bloqueada: row.bloqueada,
    status: row.status,
    categoria: normalizeCategoria(row.categoria),
    created_at: row.created_at.toISOString(),
  };
}

export function normalizeCategoria(value: unknown): ChatCategoria {
  const raw = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (raw === 'BUDGET' || raw === 'ORCAMENTO' || raw === 'DIRECT') {
    return raw;
  }
  return 'DIRECT';
}

export function parseCategoriaFilter(value: unknown): ChatTab | undefined {
  if (value == null || value === '') return undefined;
  const raw = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (raw === 'DIRECT') return 'DIRECT';
  if (raw === 'BUDGET' || raw === 'ORCAMENTO') return 'BUDGET';
  throw new ChatError(400, 'Categoria inválida. Use DIRECT ou BUDGET.');
}

function categoriaWhere(tab?: ChatTab) {
  if (tab === 'DIRECT') return { categoria: 'DIRECT' as const };
  if (tab === 'BUDGET') return { categoria: { in: BUDGET_CATEGORIES } };
  return {};
}

export function parseChatId(value: unknown, label: string): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw || !isUuid(raw)) {
    throw new ChatError(400, `${label} inválido.`);
  }
  return raw;
}

export async function resolveChatActor(clerkId: string): Promise<ActorPerfil> {
  const actor = await prisma.perfil.findUnique({
    where: { clerk_id: clerkId },
    select: { id: true, role: true, deleted_at: true, nome: true, email: true },
  });
  if (!actor || actor.deleted_at) {
    throw new ChatError(404, 'Perfil não encontrado.');
  }
  return actor;
}

export async function requireChatActor(request: Request): Promise<ActorPerfil> {
  const { userId } = await resolvePerfilSession(request);
  if (!userId) {
    throw new ChatError(401, 'Não autenticado.');
  }
  return resolveChatActor(userId);
}

export function chatErrorResponse(error: unknown) {
  if (error instanceof ChatError) {
    return NextResponse.json(
      {
        sucesso: false,
        bloqueado: error.bloqueado || undefined,
        erro: error.message,
      },
      { status: error.status }
    );
  }
  console.error('[chat] falha inesperada', {
    error: error instanceof Error ? error.message : String(error),
  });
  return NextResponse.json({ sucesso: false, erro: 'Falha no chat.' }, { status: 500 });
}

export async function listConversations(
  actorId: string,
  tab?: ChatTab
): Promise<ChatConversationDto[]> {
  const rows = await prisma.mensagemChat.findMany({
    where: {
      deleted_at: null,
      ...categoriaWhere(tab),
      OR: [{ remetente_id: actorId }, { destinatario_id: actorId }],
    },
    orderBy: { created_at: 'desc' },
    take: CONVERSATION_SCAN_LIMIT,
    select: {
      id: true,
      remetente_id: true,
      destinatario_id: true,
      mensagem: true,
      bloqueada: true,
      status: true,
      categoria: true,
      created_at: true,
      lido_em: true,
      remetente: {
        select: { id: true, nome: true, role: true, cidade: true, estado: true },
      },
      destinatario: {
        select: { id: true, nome: true, role: true, cidade: true, estado: true },
      },
    },
  });

  const conversations = new Map<string, ChatConversationDto>();

  for (const row of rows) {
    const peerRow = row.remetente_id === actorId ? row.destinatario : row.remetente;
    if (!peerRow || conversations.has(peerRow.id)) continue;

    const unreadCount = rows.filter(
      (item) =>
        item.destinatario_id === actorId &&
        item.remetente_id === peerRow.id &&
        item.lido_em == null &&
        !item.bloqueada
    ).length;

    conversations.set(peerRow.id, {
      peer: toPeer(peerRow),
      lastMessage: toMessageDto(row),
      unreadCount,
      categoria: normalizeCategoria(row.categoria),
    });
  }

  return Array.from(conversations.values());
}

export async function getHistorico(
  actorId: string,
  interlocutorId: string
): Promise<ChatMessageDto[]> {
  const peerId = parseChatId(interlocutorId, 'interlocutor_id');
  const rows = await prisma.mensagemChat.findMany({
    where: {
      deleted_at: null,
      OR: [
        { remetente_id: actorId, destinatario_id: peerId },
        { remetente_id: peerId, destinatario_id: actorId },
      ],
    },
    orderBy: { created_at: 'asc' },
    take: HISTORY_LIMIT,
  });

  await prisma.mensagemChat.updateMany({
    where: {
      destinatario_id: actorId,
      remetente_id: peerId,
      deleted_at: null,
      lido_em: null,
    },
    data: {
      status: 'lido',
      lido_em: new Date(),
      entregue_em: new Date(),
    },
  });

  return rows.map(toMessageDto);
}

export async function getChatContext(
  actorId: string,
  artistIdRaw: string,
  artworkIdRaw?: string
): Promise<ChatContextDto> {
  const artistId = parseChatId(artistIdRaw, 'artistId');
  if (artistId === actorId) {
    throw new ChatError(400, 'Não é possível iniciar uma conversa consigo mesmo.');
  }

  const artist = await prisma.perfil.findFirst({
    where: {
      id: artistId,
      deleted_at: null,
      statusConta: 'ATIVO',
    },
    select: { id: true, nome: true, role: true, cidade: true, estado: true },
  });
  if (!artist) {
    throw new ChatError(404, 'Artista não encontrado.');
  }

  let artwork: ChatArtworkRef | null = null;
  if (artworkIdRaw) {
    const artworkId = parseChatId(artworkIdRaw, 'artworkId');
    const row = await prisma.portfolio.findFirst({
      where: {
        id: artworkId,
        tatuador_id: artistId,
        deleted_at: null,
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
      },
    });
    if (row) {
      artwork = {
        id: row.id,
        tatuadorId: row.tatuador_id,
        imageUrl: row.url_imagem,
        style: row.estilo,
        bodyPart: row.body_part,
        sessionDuration: row.session_duration,
        isHealed: row.is_healed,
        descricao: row.descricao,
      };
    }
  }

  return { peer: toPeer(artist), artwork };
}

export async function enviarMensagem(params: {
  actorId: string;
  destinatarioId: string;
  mensagem: string;
  artworkId?: string;
  categoria?: unknown;
}): Promise<ChatMessageDto> {
  const destinatarioId = parseChatId(params.destinatarioId, 'destinatario_id');
  if (destinatarioId === params.actorId) {
    throw new ChatError(400, 'Não é possível enviar mensagem para si mesmo.');
  }

  const trimmed = params.mensagem.trim();
  if (!trimmed) {
    throw new ChatError(400, 'A mensagem não pode estar vazia.');
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new ChatError(400, 'Mensagem muito longa.');
  }

  const moderation = validateChatMessage(trimmed);
  if (!moderation.isValid) {
    await prisma.mensagemChat.create({
      data: {
        remetente_id: params.actorId,
        destinatario_id: destinatarioId,
        mensagem: escapeMessage(trimmed),
        bloqueada: true,
        status: 'enviado',
      },
    });
    throw new ChatError(403, moderation.error || 'Mensagem bloqueada pelas diretrizes.', true);
  }

  const peer = await prisma.perfil.findFirst({
    where: { id: destinatarioId, deleted_at: null, statusConta: 'ATIVO' },
    select: { id: true },
  });
  if (!peer) {
    throw new ChatError(404, 'Destinatário não encontrado.');
  }

  let composed = escapeMessage(trimmed);
  let inferredCategoria: ChatCategoria | undefined;
  if (params.artworkId) {
    const artworkId = parseChatId(params.artworkId, 'artworkId');
    const artwork = await prisma.portfolio.findFirst({
      where: { id: artworkId, tatuador_id: destinatarioId, deleted_at: null },
      select: { estilo: true, body_part: true },
    });
    if (artwork) {
      const style = artwork.estilo || 'arte';
      const part = artwork.body_part ? ` · ${artwork.body_part}` : '';
      composed = `[Referência de projeto: ${style}${part}]\n${composed}`;
      inferredCategoria = 'ORCAMENTO';
    }
  }

  const categoria = params.categoria != null
    ? normalizeCategoria(params.categoria)
    : inferredCategoria ?? 'DIRECT';

  const created = await prisma.mensagemChat.create({
    data: {
      remetente_id: params.actorId,
      destinatario_id: destinatarioId,
      mensagem: composed,
      bloqueada: false,
      status: 'enviado',
      categoria,
    },
  });

  return toMessageDto(created);
}
