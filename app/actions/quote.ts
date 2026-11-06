'use server';

import { revalidatePath } from 'next/cache';
import { fetchExpressApi, resolveExpressAuthHeaders } from '@/lib/server/express-bff';
import { isPortfolioBodyPart } from '@/lib/portfolio-metadata';
import { validateChatMessage } from '@/lib/utils/chat-moderation';
import type { ApproveQuoteResult, ArtistQuoteReview } from '@/lib/types/artist-quote';

const MAX_ESTIMATED_SIZE_LENGTH = 40;

export type CreateQuoteRequestResult = {
  quoteId: string;
  chatId: string;
  artistId: string;
};

export type { ApproveQuoteResult, ArtistQuoteReview };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readError(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) return fallback;
  if (typeof payload.erro === 'string' && payload.erro) return payload.erro;
  if (typeof payload.error === 'string' && payload.error) return payload.error;
  return fallback;
}

function readField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function composeQuoteMessage(bodyPart: string, estimatedSize: string): string {
  return `Pedido de orçamento\nLocal: ${bodyPart}\nTamanho estimado: ${estimatedSize}`;
}

async function callQuoteApi(pathname: string, init?: RequestInit) {
  const authHeaders = await resolveExpressAuthHeaders();
  return fetchExpressApi(pathname, {
    ...init,
    headers: {
      ...authHeaders,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
}

function throwExpressError(status: number, payload: unknown, fallback: string): never {
  if (status === 401) throw new Error('Não autenticado.');
  throw new Error(readError(payload, fallback));
}

function revalidateQuotePaths(includeLayout = false): void {
  if (includeLayout) revalidatePath('/dashboard', 'layout');
  revalidatePath('/dashboard/tatuador');
  revalidatePath('/dashboard/estudio');
  revalidatePath('/dashboard/agenda');
  revalidatePath('/dashboard/chat');
  if (includeLayout) {
    revalidatePath('/dashboard/cliente');
    revalidatePath('/dashboard/pagamentos');
  }
}

export async function createQuoteRequest(
  formData: FormData
): Promise<CreateQuoteRequestResult> {
  const artistId = readField(formData, 'artistId');
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

  try {
    const { status, payload } = await callQuoteApi('/api/quotes', {
      method: 'POST',
      body: JSON.stringify({ artistId, bodyPart, estimatedSize }),
    });

    if (status === 401 || !isRecord(payload) || payload.sucesso !== true) {
      throwExpressError(status, payload, 'Falha ao criar orçamento.');
    }

    const quoteId = typeof payload.quoteId === 'string' ? payload.quoteId : '';
    const chatId = typeof payload.chatId === 'string' ? payload.chatId : quoteId;
    const resolvedArtistId = typeof payload.artistId === 'string' ? payload.artistId : artistId;
    if (!quoteId) throw new Error('Falha ao criar orçamento.');

    revalidateQuotePaths();

    return {
      quoteId,
      chatId,
      artistId: resolvedArtistId,
    };
  } catch (error) {
    if (error instanceof Error && error.message) throw error;
    throw new Error('Falha ao criar orçamento.');
  }
}

export async function getPendingArtistQuotes(): Promise<ArtistQuoteReview[]> {
  try {
    const { status, payload } = await callQuoteApi('/api/quotes/pending');

    if (status === 401 || !isRecord(payload) || payload.sucesso !== true) {
      throwExpressError(status, payload, 'Não foi possível carregar os orçamentos.');
    }

    if (!Array.isArray(payload.quotes)) {
      throw new Error('Não foi possível carregar os orçamentos.');
    }

    return payload.quotes as ArtistQuoteReview[];
  } catch (error) {
    if (error instanceof Error && error.message) throw error;
    throw new Error('Não foi possível carregar os orçamentos.');
  }
}

export async function approveArtistQuote(input: {
  quoteId: string;
  totalValue: number | string;
}): Promise<ApproveQuoteResult> {
  const quoteId = String(input.quoteId ?? '').trim();
  if (!quoteId) throw new Error('quoteId inválido.');

  try {
    const { status, payload } = await callQuoteApi(
      `/api/quotes/${encodeURIComponent(quoteId)}/approve`,
      {
        method: 'POST',
        body: JSON.stringify({ totalValue: input.totalValue }),
      }
    );

    if (status === 401 || !isRecord(payload) || payload.sucesso !== true) {
      throwExpressError(status, payload, 'Não foi possível aprovar o orçamento.');
    }

    const agendamentoId = typeof payload.agendamentoId === 'string' ? payload.agendamentoId : '';
    const totalValue = typeof payload.totalValue === 'number' ? payload.totalValue : Number.NaN;
    const depositValue =
      typeof payload.depositValue === 'number' ? payload.depositValue : Number.NaN;
    if (!agendamentoId || !Number.isFinite(totalValue) || !Number.isFinite(depositValue)) {
      throw new Error('Não foi possível aprovar o orçamento.');
    }

    revalidateQuotePaths(true);

    return {
      quoteId: typeof payload.quoteId === 'string' ? payload.quoteId : quoteId,
      agendamentoId,
      totalValue,
      depositValue,
    };
  } catch (error) {
    if (error instanceof Error && error.message) throw error;
    throw new Error('Não foi possível aprovar o orçamento.');
  }
}
