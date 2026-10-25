'use server';

import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { isPortfolioBodyPart } from '@/lib/portfolio-metadata';
import { ChatError, parseChatId, resolveChatActor } from '@/lib/services/chat';
import { validateChatMessage } from '@/lib/utils/chat-moderation';
import { depositAmount } from '@/lib/utils/agenda-status';
import type { ApproveQuoteResult, ArtistQuoteReview } from '@/lib/types/artist-quote';

const MAX_ESTIMATED_SIZE_LENGTH = 40;
const MAX_QUOTE_TOTAL = 999999.99;
const TENTATIVE_SLOT_MS = 14 * 24 * 60 * 60 * 1000;

export type CreateQuoteRequestResult = {
  quoteId: string;
  chatId: string;
  artistId: string;
};

export type { ApproveQuoteResult, ArtistQuoteReview };

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

  revalidatePath('/dashboard/tatuador');
  revalidatePath('/dashboard/estudio');
  revalidatePath('/dashboard/agenda');
  revalidatePath('/dashboard/chat');

  return {
    quoteId: created.id,
    chatId: created.id,
    artistId: artist.id,
  };
}

function asError(error: unknown, fallback: string): Error {
  if (error instanceof ChatError) return new Error(error.message);
  if (error instanceof Error && error.message) return error;
  return new Error(fallback);
}

function parseMoney(raw: string): number {
  const trimmed = raw.trim().replace(/\s/g, '');
  if (!trimmed) return Number.NaN;
  const normalized = trimmed.includes(',')
    ? trimmed.replace(/\./g, '').replace(',', '.')
    : trimmed.replace(/[^\d.]/g, '');
  const value = Number(normalized);
  return Number.isFinite(value) ? Number(value.toFixed(2)) : Number.NaN;
}

function formatPriceRange(total: number): string {
  return `R$ ${total.toFixed(2)}`;
}

function tentativeSlot(seed: string): Date {
  const slot = new Date(Date.now() + TENTATIVE_SLOT_MS);
  const offset = Array.from(seed).reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 3600;
  slot.setSeconds(offset, 0);
  return slot;
}

function displayName(nome: string | null | undefined): string {
  const trimmed = (nome ?? '').trim();
  return trimmed || 'Cliente';
}

export async function getPendingArtistQuotes(): Promise<ArtistQuoteReview[]> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('Não autenticado.');
  }

  try {
    const actor = await resolveChatActor(userId);
    if (actor.role !== 'tatuador' && actor.role !== 'estudio') {
      throw new Error('Apenas artistas podem revisar orçamentos.');
    }

    const rows = await prisma.mensagemChat.findMany({
      where: {
        destinatario_id: actor.id,
        deleted_at: null,
        bloqueada: false,
        categoria: { in: ['ORCAMENTO', 'BUDGET'] },
        quote_status: 'solicitado',
      },
      orderBy: { created_at: 'desc' },
      take: 50,
      select: {
        id: true,
        remetente_id: true,
        mensagem: true,
        body_part: true,
        estimated_size: true,
        reference_image: true,
        price_range: true,
        quote_status: true,
        created_at: true,
        remetente: { select: { id: true, nome: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      clientId: row.remetente.id,
      clientName: displayName(row.remetente.nome),
      bodyPart: row.body_part,
      estimatedSize: row.estimated_size,
      referenceImage: row.reference_image,
      priceRange: row.price_range,
      message: row.mensagem,
      createdAt: row.created_at.toISOString(),
      quoteStatus: row.quote_status ?? 'solicitado',
    }));
  } catch (error) {
    throw asError(error, 'Não foi possível carregar os orçamentos.');
  }
}

export async function approveArtistQuote(input: {
  quoteId: string;
  totalValue: number | string;
}): Promise<ApproveQuoteResult> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('Não autenticado.');
  }

  const quoteId = parseChatId(input.quoteId, 'quoteId');
  const totalValue =
    typeof input.totalValue === 'number'
      ? Number(input.totalValue.toFixed(2))
      : parseMoney(String(input.totalValue));

  if (!Number.isFinite(totalValue) || totalValue <= 0 || totalValue > MAX_QUOTE_TOTAL) {
    throw new Error('Informe um valor total válido.');
  }

  const depositValue = depositAmount(totalValue);
  const priceRange = formatPriceRange(totalValue);

  try {
    const actor = await resolveChatActor(userId);
    if (actor.role !== 'tatuador' && actor.role !== 'estudio') {
      throw new Error('Apenas artistas podem aprovar orçamentos.');
    }

    const result = await prisma.$transaction(async (tx) => {
      const quote = await tx.mensagemChat.findFirst({
        where: {
          id: quoteId,
          destinatario_id: actor.id,
          deleted_at: null,
          bloqueada: false,
          categoria: { in: ['ORCAMENTO', 'BUDGET'] },
        },
        select: {
          id: true,
          remetente_id: true,
          body_part: true,
          estimated_size: true,
          reference_image: true,
          quote_status: true,
        },
      });
      if (!quote) {
        throw new Error('Orçamento não encontrado.');
      }
      if (quote.quote_status !== 'solicitado') {
        throw new Error('Este orçamento já foi processado.');
      }

      const client = await tx.perfil.findFirst({
        where: { id: quote.remetente_id, deleted_at: null, statusConta: 'ATIVO' },
        select: { id: true },
      });
      if (!client) {
        throw new Error('Cliente não encontrado.');
      }

      const agendamento = await tx.agendamento.create({
        data: {
          cliente_id: client.id,
          tatuador_id: actor.id,
          data_hora: tentativeSlot(quote.id),
          status: 'aguardando_sinal',
          session_status: 'AWAITING_PAYMENT',
          valor_total: new Prisma.Decimal(totalValue.toFixed(2)),
          valor_sinal: new Prisma.Decimal(depositValue.toFixed(2)),
          sinal_pago: false,
          extras: {
            create: [
              {
                descricao: `Orçamento ${quote.id}`,
                valor: new Prisma.Decimal('0.00'),
              },
            ],
          },
        },
        select: { id: true },
      });

      await tx.mensagemChat.update({
        where: { id: quote.id },
        data: {
          quote_status: 'enviado',
          price_range: priceRange,
        },
      });

      const reply = [
        'Orçamento enviado',
        `Valor total: ${priceRange}`,
        `Sinal (25%): ${formatPriceRange(depositValue)}`,
      ].join('\n');

      await tx.mensagemChat.create({
        data: {
          remetente_id: actor.id,
          destinatario_id: client.id,
          mensagem: reply,
          bloqueada: false,
          status: 'enviado',
          categoria: 'ORCAMENTO',
          body_part: quote.body_part,
          estimated_size: quote.estimated_size,
          reference_image: quote.reference_image,
          price_range: priceRange,
          quote_status: 'enviado',
        },
      });

      return agendamento;
    });

    revalidatePath('/dashboard', 'layout');
    revalidatePath('/dashboard/tatuador');
    revalidatePath('/dashboard/cliente');
    revalidatePath('/dashboard/agenda');
    revalidatePath('/dashboard/estudio');
    revalidatePath('/dashboard/chat');
    revalidatePath('/dashboard/pagamentos');

    return {
      quoteId,
      agendamentoId: result.id,
      totalValue,
      depositValue,
    };
  } catch (error) {
    throw asError(error, 'Não foi possível aprovar o orçamento.');
  }
}
