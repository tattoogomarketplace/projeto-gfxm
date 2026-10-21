'use server';

import {
  BudgetEstimatorError,
  getBudgetEstimate,
  getCheaperArtists,
  type BudgetEstimateDto,
  type CheaperArtistDto,
} from '@/lib/services/budget-estimator';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { parseChatId, resolveChatActor } from '@/lib/services/chat';
import { validateChatMessage } from '@/lib/utils/chat-moderation';

export type BudgetQuoteResult = {
  quoteId: string;
  chatId: string;
  artistId: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

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

export async function getBudgetEstimateAction(input: {
  style?: string | null;
  location?: string | null;
  artistId?: string | null;
  artworkId?: string | null;
  artistName?: string | null;
}): Promise<BudgetEstimateDto> {
  try {
    return await getBudgetEstimate(input);
  } catch (error) {
    if (error instanceof BudgetEstimatorError) throw error;
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
    return await getCheaperArtists(input);
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
  const { userId } = await auth();
  if (!userId) {
    throw new Error('Não autenticado.');
  }

  const artistId = parseChatId(input.artistId, 'artistId');
  const artworkIdRaw = readString(input.artworkId);
  const artworkId = isUuid(artworkIdRaw) ? artworkIdRaw : '';
  const style = readString(input.style) || 'arte';
  const estimateRange = readString(input.estimateRange);
  const imageUrl = readString(input.imageUrl);

  const lines = [
    'Pedido de orçamento via Estimativa Inteligente IA',
    `Estilo: ${style}`,
  ];
  if (estimateRange) lines.push(`Estimativa de mercado: ${estimateRange}`);
  if (artworkId) lines.push(`Referência: post ${artworkId}`);
  const mensagem = lines.join('\n');

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

  let referenceImage = imageUrl || null;
  let bodyPart: string | null = null;
  if (artworkId) {
    const artwork = await prisma.portfolio.findFirst({
      where: { id: artworkId, deleted_at: null },
      select: { url_imagem: true, body_part: true, estilo: true },
    });
    if (artwork) {
      referenceImage = artwork.url_imagem || referenceImage;
      bodyPart = artwork.body_part || null;
    }
  }

  const created = await prisma.mensagemChat.create({
    data: {
      remetente_id: actor.id,
      destinatario_id: artist.id,
      mensagem,
      bloqueada: false,
      status: 'enviado',
      categoria: 'ORCAMENTO',
      reference_image: referenceImage,
      body_part: bodyPart,
      price_range: estimateRange || null,
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
