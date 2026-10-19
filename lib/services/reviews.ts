import { prisma } from '@/lib/prisma';
import { PLACEHOLDER_REVIEWS, REVIEW_FEATURED_ARTISTS } from '@/lib/review-mock';
import type {
  ArtistReviewsPayload,
  FeaturedReviewsPayload,
  ReviewAuthor,
  ReviewDto,
  ReviewPortfolioRef,
  ReviewSummary,
  ReviewTarget,
} from '@/lib/types/review';

export class ReviewError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ReviewError';
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_REPLY_LENGTH = 1000;
const MAX_CONTENT_LENGTH = 2000;
const FEATURED_LIMIT = 8;
const ARTIST_REVIEWS_LIMIT = 40;

type ReviewActor = {
  id: string;
  role: string;
  deleted_at: Date | null;
};

type ReviewRow = {
  id: string;
  author_id: string;
  target_id: string;
  portfolio_id: string | null;
  rating: number;
  content: string;
  artist_reply: string | null;
  replied_at: Date | null;
  is_verified: boolean;
  created_at: Date;
  author: {
    id: string;
    nome: string | null;
    role: string;
  } | null;
  target: {
    id: string;
    nome: string | null;
    role: string;
  } | null;
  portfolio: {
    id: string;
    url_imagem: string;
    estilo: string;
  } | null;
};

const REVIEW_SELECT = {
  id: true,
  author_id: true,
  target_id: true,
  portfolio_id: true,
  rating: true,
  content: true,
  artist_reply: true,
  replied_at: true,
  is_verified: true,
  created_at: true,
  author: {
    select: { id: true, nome: true, role: true },
  },
  target: {
    select: { id: true, nome: true, role: true },
  },
  portfolio: {
    select: { id: true, url_imagem: true, estilo: true },
  },
} as const;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function displayName(nome: string | null | undefined, fallback: string): string {
  const trimmed = (nome ?? '').trim();
  return trimmed || fallback;
}

function initialFrom(name: string): string {
  const letter = name.charAt(0);
  return letter ? letter.toUpperCase() : 'A';
}

function clampRating(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(5, Math.max(1, Math.round(value)));
}

function toAuthor(row: ReviewRow['author'], fallbackId: string): ReviewAuthor {
  const name = displayName(row?.nome, '');
  return {
    id: row?.id || fallbackId,
    name,
    avatarUrl: null,
    initial: initialFrom(name),
  };
}

function toTarget(row: ReviewRow['target'], fallbackId: string): ReviewTarget {
  const name = displayName(row?.nome, '');
  const role = row?.role === 'estudio' ? 'estudio' : 'tatuador';
  return {
    id: row?.id || fallbackId,
    name,
    role,
    avatarUrl: null,
    initial: initialFrom(name),
  };
}

function toPortfolio(row: ReviewRow['portfolio']): ReviewPortfolioRef {
  if (!row?.id) return null;
  return {
    id: row.id,
    imageUrl: row.url_imagem || '',
    style: row.estilo || '',
  };
}

export function toReviewDto(row: ReviewRow): ReviewDto {
  return {
    id: row.id,
    authorId: row.author_id,
    targetId: row.target_id,
    portfolioId: row.portfolio_id,
    rating: clampRating(row.rating),
    content: (row.content ?? '').trim(),
    artistReply: row.artist_reply?.trim() || null,
    repliedAt: row.replied_at ? row.replied_at.toISOString() : null,
    isVerified: Boolean(row.is_verified),
    createdAt: row.created_at.toISOString(),
    author: toAuthor(row.author, row.author_id),
    target: toTarget(row.target, row.target_id),
    portfolio: toPortfolio(row.portfolio),
  };
}

function summarize(targetId: string, reviews: ReviewDto[]): ReviewSummary {
  const count = reviews.length;
  const verifiedCount = reviews.filter((item) => item.isVerified).length;
  const averageRating =
    count === 0
      ? 0
      : Math.round((reviews.reduce((sum, item) => sum + item.rating, 0) / count) * 10) / 10;
  return { targetId, count, averageRating, verifiedCount };
}

function mockReviewsForTarget(targetId: string): ReviewDto[] {
  return PLACEHOLDER_REVIEWS.filter((item) => item.targetId === targetId);
}

function mockTarget(targetId: string): ReviewTarget {
  const featured = Object.values(REVIEW_FEATURED_ARTISTS).find((artist) => artist.id === targetId);
  if (featured) return featured;
  const fromReview = PLACEHOLDER_REVIEWS.find((item) => item.targetId === targetId)?.target;
  if (fromReview) return fromReview;
  return {
    id: targetId,
    name: '',
    role: 'tatuador',
    avatarUrl: null,
    initial: 'A',
  };
}

async function loadActorByClerkId(clerkId: string): Promise<ReviewActor | null> {
  return prisma.perfil.findUnique({
    where: { clerk_id: clerkId },
    select: { id: true, role: true, deleted_at: true },
  });
}

export async function loadReviewActor(clerkId: string): Promise<ReviewActor> {
  const actor = await loadActorByClerkId(clerkId);
  if (!actor || actor.deleted_at) {
    throw new ReviewError(404, 'Perfil não encontrado.');
  }
  return actor;
}

export async function getArtistReviews(artistIdRaw: string): Promise<ArtistReviewsPayload> {
  const artistId = String(artistIdRaw ?? '').trim();
  if (!artistId) {
    throw new ReviewError(400, 'Artista inválido.');
  }

  if (!isUuid(artistId)) {
    const reviews = mockReviewsForTarget(artistId);
    const target = mockTarget(artistId);
    return { target, summary: summarize(artistId, reviews), reviews };
  }

  try {
    const [targetRow, rows] = await Promise.all([
      prisma.perfil.findFirst({
        where: {
          id: artistId,
          deleted_at: null,
          statusConta: 'ATIVO',
          role: { in: ['tatuador', 'estudio'] },
        },
        select: { id: true, nome: true, role: true },
      }),
      prisma.review.findMany({
        where: { target_id: artistId, deleted_at: null },
        select: REVIEW_SELECT,
        orderBy: { created_at: 'desc' },
        take: ARTIST_REVIEWS_LIMIT,
      }),
    ]);

    if (!targetRow) {
      throw new ReviewError(404, 'Artista não encontrado.');
    }

    const reviews = rows.map((row) => toReviewDto(row as ReviewRow));
    return {
      target: toTarget(targetRow, artistId),
      summary: summarize(artistId, reviews),
      reviews,
    };
  } catch (error) {
    if (error instanceof ReviewError) throw error;
    const reviews = mockReviewsForTarget(artistId);
    return {
      target: mockTarget(artistId),
      summary: summarize(artistId, reviews),
      reviews,
    };
  }
}

export async function getReviewById(reviewIdRaw: string): Promise<ReviewDto> {
  const reviewId = String(reviewIdRaw ?? '').trim();
  if (!reviewId) {
    throw new ReviewError(400, 'Avaliação inválida.');
  }

  if (!isUuid(reviewId)) {
    const mock = PLACEHOLDER_REVIEWS.find((item) => item.id === reviewId);
    if (!mock) {
      throw new ReviewError(404, 'Avaliação não encontrada.');
    }
    return mock;
  }

  try {
    const row = await prisma.review.findFirst({
      where: { id: reviewId, deleted_at: null },
      select: REVIEW_SELECT,
    });
    if (!row) {
      throw new ReviewError(404, 'Avaliação não encontrada.');
    }
    return toReviewDto(row as ReviewRow);
  } catch (error) {
    if (error instanceof ReviewError) throw error;
    const mock = PLACEHOLDER_REVIEWS.find((item) => item.id === reviewId);
    if (mock) return mock;
    throw new ReviewError(404, 'Avaliação não encontrada.');
  }
}

export async function getFeaturedReviews(): Promise<FeaturedReviewsPayload> {
  try {
    const rows = await prisma.review.findMany({
      where: {
        deleted_at: null,
        target: {
          deleted_at: null,
          statusConta: 'ATIVO',
          role: { in: ['tatuador', 'estudio'] },
        },
      },
      select: REVIEW_SELECT,
      orderBy: [{ is_verified: 'desc' }, { rating: 'desc' }, { created_at: 'desc' }],
      take: FEATURED_LIMIT,
    });

    if (rows.length === 0) {
      return { reviews: PLACEHOLDER_REVIEWS.slice(0, FEATURED_LIMIT) };
    }

    return { reviews: rows.map((row) => toReviewDto(row as ReviewRow)) };
  } catch {
    return { reviews: PLACEHOLDER_REVIEWS.slice(0, FEATURED_LIMIT) };
  }
}

export async function replyToReview(
  actor: ReviewActor,
  reviewIdRaw: string,
  replyRaw: string
): Promise<ReviewDto> {
  if (actor.role !== 'tatuador' && actor.role !== 'estudio') {
    throw new ReviewError(403, 'Apenas o artista ou o estúdio avaliado pode responder.');
  }

  const reviewId = String(reviewIdRaw ?? '').trim();
  if (!isUuid(reviewId)) {
    throw new ReviewError(400, 'Avaliação inválida.');
  }

  const reply = String(replyRaw ?? '').trim();
  if (!reply) {
    throw new ReviewError(400, 'A resposta não pode ficar vazia.');
  }
  if (reply.length > MAX_REPLY_LENGTH) {
    throw new ReviewError(400, 'A resposta excede o limite permitido.');
  }

  const existing = await prisma.review.findFirst({
    where: { id: reviewId, deleted_at: null },
    select: { id: true, target_id: true },
  });

  if (!existing) {
    throw new ReviewError(404, 'Avaliação não encontrada.');
  }
  if (existing.target_id !== actor.id) {
    throw new ReviewError(403, 'Você só pode responder avaliações do seu perfil.');
  }

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: {
      artist_reply: reply,
      replied_at: new Date(),
    },
    select: REVIEW_SELECT,
  });

  return toReviewDto(updated as ReviewRow);
}

export function parseReviewContent(value: unknown): string {
  const content = typeof value === 'string' ? value.trim() : '';
  if (!content) {
    throw new ReviewError(400, 'O conteúdo da avaliação é obrigatório.');
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    throw new ReviewError(400, 'O conteúdo excede o limite permitido.');
  }
  return content;
}
