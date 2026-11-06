'use server';

import { fetchExpressApi, resolveExpressAuthHeaders } from '@/lib/server/express-bff';
import type { BudgetEstimateDto, CheaperArtistDto } from '@/lib/services/budget-estimator';
import { validateChatMessage } from '@/lib/utils/chat-moderation';

export type BudgetQuoteResult = {
  quoteId: string;
  chatId: string;
  artistId: string;
};

const FALLBACK_ESTIMATE: BudgetEstimateDto = {
  style: 'Realismo',
  location: 'Brasil',
  artistName: 'Artista',
  artistId: null,
  artworkId: null,
  imageUrl: null,
  minPrice: 800,
  maxPrice: 1200,
  avgPrice: 1000,
  sampleSize: 0,
  usedFallback: true,
  rangeLabel: 'R$ 800 - R$ 1.200',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readError(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) return fallback;
  if (typeof payload.erro === 'string' && payload.erro) return payload.erro;
  if (typeof payload.error === 'string' && payload.error) return payload.error;
  return fallback;
}

function toQuery(params: Record<string, string | number | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === '') continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

async function callBudgetApi(pathname: string, init?: RequestInit) {
  const authHeaders = await resolveExpressAuthHeaders();
  return fetchExpressApi(pathname, {
    ...init,
    headers: {
      ...authHeaders,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
}

export async function getBudgetEstimateAction(input: {
  style?: string | null;
  location?: string | null;
  artistId?: string | null;
  artworkId?: string | null;
  artistName?: string | null;
}): Promise<BudgetEstimateDto> {
  try {
    const { status, payload } = await callBudgetApi(
      `/api/budget/estimate${toQuery({
        style: input.style,
        location: input.location,
        artistId: input.artistId,
        artworkId: input.artworkId,
        artistName: input.artistName,
      })}`
    );

    if (status >= 400 || !isRecord(payload) || payload.sucesso !== true || !isRecord(payload.data)) {
      return {
        ...FALLBACK_ESTIMATE,
        style: input.style?.trim() || FALLBACK_ESTIMATE.style,
        location: input.location?.trim() || FALLBACK_ESTIMATE.location,
        artistName: input.artistName?.trim() || FALLBACK_ESTIMATE.artistName,
        artistId: input.artistId ?? null,
        artworkId: input.artworkId ?? null,
      };
    }

    return payload.data as unknown as BudgetEstimateDto;
  } catch (error) {
    console.error('[budget] falha ao calcular estimativa', error);
    return {
      ...FALLBACK_ESTIMATE,
      style: input.style?.trim() || FALLBACK_ESTIMATE.style,
      location: input.location?.trim() || FALLBACK_ESTIMATE.location,
      artistName: input.artistName?.trim() || FALLBACK_ESTIMATE.artistName,
      artistId: input.artistId ?? null,
      artworkId: input.artworkId ?? null,
    };
  }
}

export async function getCheaperArtistsAction(input: {
  styleId?: string | null;
  style?: string | null;
  currentArtistId?: string | null;
  maxPriceLimit?: number | null;
  location?: string | null;
}): Promise<CheaperArtistDto[]> {
  try {
    const { status, payload } = await callBudgetApi(
      `/api/budget/cheaper${toQuery({
        styleId: input.styleId,
        style: input.style,
        currentArtistId: input.currentArtistId,
        maxPriceLimit: input.maxPriceLimit,
        location: input.location,
      })}`
    );

    if (status >= 400 || !isRecord(payload) || payload.sucesso !== true || !Array.isArray(payload.artists)) {
      return [];
    }

    return payload.artists as CheaperArtistDto[];
  } catch (error) {
    console.error('[budget] falha ao listar artistas mais acessíveis', error);
    return [];
  }
}

export async function createBudgetQuoteRequest(input: {
  artistId: string;
  artworkId?: string | null;
  style?: string | null;
  estimateRange?: string | null;
  imageUrl?: string | null;
}): Promise<BudgetQuoteResult> {
  const style = typeof input.style === 'string' && input.style.trim() ? input.style.trim() : 'arte';
  const estimateRange = typeof input.estimateRange === 'string' ? input.estimateRange.trim() : '';
  const artworkId = typeof input.artworkId === 'string' ? input.artworkId.trim() : '';
  const lines = [
    'Pedido de orçamento via Estimativa Inteligente IA',
    `Estilo: ${style}`,
  ];
  if (estimateRange) lines.push(`Estimativa de mercado: ${estimateRange}`);
  if (artworkId) lines.push(`Referência: post ${artworkId}`);
  const moderation = validateChatMessage(lines.join('\n'));
  if (!moderation.isValid) {
    throw new Error(moderation.error || 'Pedido bloqueado pelas diretrizes.');
  }

  try {
    const { status, payload } = await callBudgetApi('/api/budget/quote', {
      method: 'POST',
      body: JSON.stringify({
        artistId: input.artistId,
        artworkId: input.artworkId,
        style: input.style,
        estimateRange: input.estimateRange,
        imageUrl: input.imageUrl,
      }),
    });

    if (status === 401) {
      throw new Error('Não autenticado.');
    }

    if (!isRecord(payload) || payload.sucesso !== true) {
      throw new Error(readError(payload, 'Falha ao criar orçamento.'));
    }

    const quoteId = typeof payload.quoteId === 'string' ? payload.quoteId : '';
    const chatId = typeof payload.chatId === 'string' ? payload.chatId : quoteId;
    const artistId = typeof payload.artistId === 'string' ? payload.artistId : input.artistId;
    if (!quoteId) throw new Error('Falha ao criar orçamento.');

    return { quoteId, chatId, artistId };
  } catch (error) {
    if (error instanceof Error && error.message) throw error;
    throw new Error('Falha ao criar orçamento.');
  }
}
