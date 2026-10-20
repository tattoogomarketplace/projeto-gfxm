'use server';

import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { isPortfolioBodyPart } from '@/lib/portfolio-metadata';
import { parseChatId, resolveChatActor } from '@/lib/services/chat';
import { validateChatMessage } from '@/lib/utils/chat-moderation';

const MAX_ESTIMATED_SIZE_LENGTH = 40;

export type CreateQuoteRequestResult = {
  quoteId: string;
  chatId: string;
  artistId: string;
};

function readField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function composeQuoteMessage(bodyPart: string, estimatedSize: string): string {
  return `Pedido de orçamento\nLocal: ${bodyPart}\nTamanho estimado: ${estimatedSize}`;
}

export async function createQuoteRequest(
  formData: FormData
): Promise<CreateQuoteRequestResult> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('Não autenticado.');
  }

  const artistId = parseChatId(readField(formData, 'artistId'), 'artistId');
  const bodyPart = readField(formData, 'bodyPart');
  const estimatedSize = readField(formData, 'estimatedSize');

  if (!isPortfolioBodyPart(bodyPart)) {
    throw new Error('Informe uma região válida.');
  }
  if (!estimatedSize) {
    throw new Error('Informe o tamanho estimado.');
  }
  if (estimatedSize.length > MAX_ESTIMATED_SIZE_LENGTH) {
    throw new Error('Tamanho estimado inválido.');
  }

  const mensagem = composeQuoteMessage(bodyPart, estimatedSize);
  const moderation = validateChatMessage(mensagem);
  if (!moderation.isValid) {
    throw new Error(moderation.error || 'Pedido bloqueado pelas diretrizes.');
  }

  const actor = await resolveChatActor(userId);
  if (actor.id === artistId) {
    throw new Error('Não é possível solicitar orçamento para si mesmo.');
  }

  const artist = await prisma.perfil.findFirst({
    where: {
      id: artistId,
      deleted_at: null,
      statusConta: 'ATIVO',
      role: 'tatuador',
    },
    select: { id: true },
  });
  if (!artist) {
    throw new Error('Artista não encontrado.');
  }

  const created = await prisma.mensagemChat.create({
    data: {
      remetente_id: actor.id,
      destinatario_id: artist.id,
      mensagem,
      bloqueada: false,
      status: 'enviado',
      categoria: 'ORCAMENTO',
      body_part: bodyPart,
      estimated_size: estimatedSize,
      quote_status: 'solicitado',
    },
    select: { id: true },
  });

  return {
    quoteId: created.id,
    chatId: created.id,
    artistId: artist.id,
  };
}
