import { artistProfileHref } from '@/lib/artist-profile';
import { PLACEHOLDER_INSPIRATIONS } from '@/lib/gallery-mock';
import { prisma } from '@/lib/prisma';
import { PLACEHOLDER_REVIEWS, REVIEW_FEATURED_ARTISTS } from '@/lib/review-mock';
import { getArtistSchedule } from '@/lib/services/artist-schedule';
import { getArtistReviews } from '@/lib/services/reviews';
import type { PortfolioItemDto } from '@/lib/portfolio-metadata';
import { normalizeUsername, USERNAME_MAX_LENGTH, USERNAME_PATTERN } from '@/lib/username';
import { listUpcomingSlots, type WeekdayId, type WorkingHoursSchedule } from '@/lib/working-hours';

export { artistProfileHref };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ArtistVitrineError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ArtistVitrineError';
  }
}

export type PublicArtistStudio = {
  id: string;
  name: string;
};

export type PublicArtistProfile = {
  id: string;
  name: string;
  username: string | null;
  initial: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  cidade: string | null;
  estado: string | null;
  studio: PublicArtistStudio | null;
  kycApproved: boolean;
  bookingEnabled: boolean;
  rating: number;
  reviewCount: number;
  styles: string[];
};

export type PublicArtistScheduleSummary = {
  day: WeekdayId;
  start: string;
  end: string;
};

export type PublicArtistVitrine = {
  artist: PublicArtistProfile;
  items: PortfolioItemDto[];
  scheduleSummary: PublicArtistScheduleSummary[];
  availableSlots: string[];
};

export function isArtistId(value: string): boolean {
  return UUID_RE.test(value);
}

function artistName(nome: string | null): string {
  const trimmed = (nome ?? '').trim();
  return trimmed || '';
}

function artistInitial(nome: string): string {
  const letter = nome.charAt(0);
  return letter ? letter.toUpperCase() : 'A';
}

function summarizeSchedule(schedule: WorkingHoursSchedule): PublicArtistScheduleSummary[] {
  return schedule.days
    .filter((day) => day.active)
    .map((day) => ({ day: day.day, start: day.start, end: day.end }));
}

function mockPortfolioItems(artistId: string, artistName: string): PortfolioItemDto[] {
  const items: PortfolioItemDto[] = [];
  const seen = new Set<string>();
  const pushItem = (id: string, imageUrl: string, style: string) => {
    if (!imageUrl || seen.has(imageUrl)) return;
    seen.add(imageUrl);
    items.push({
      id,
      tatuadorId: artistId,
      imageUrl,
      style,
      bodyPart: 'Braco',
      sessionDuration: '1-2h',
      isHealed: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      likesCount: 0,
      descricao: null,
    });
  };

  for (const review of PLACEHOLDER_REVIEWS) {
    if (review.targetId !== artistId || !review.portfolio) continue;
    pushItem(
      review.portfolio.id,
      review.portfolio.imageUrl,
      review.portfolio.style
    );
  }
  for (const inspiration of PLACEHOLDER_INSPIRATIONS) {
    if (inspiration.artistName !== artistName) continue;
    pushItem(inspiration.id, inspiration.imageUrl, inspiration.style);
  }
  for (const inspiration of PLACEHOLDER_INSPIRATIONS) {
    if (items.length >= 9) break;
    pushItem(`${artistId}-${inspiration.id}`, inspiration.imageUrl, inspiration.style);
  }
  return items;
}

function featuredMockVitrine(identifier: string): PublicArtistVitrine | null {
  const featured = Object.values(REVIEW_FEATURED_ARTISTS).find((artist) => artist.id === identifier);
  if (!featured) return null;
  const reviews = PLACEHOLDER_REVIEWS.filter((review) => review.targetId === featured.id);
  const items = mockPortfolioItems(featured.id, featured.name);
  const styles: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const style = item.style?.trim();
    if (!style || seen.has(style)) continue;
    seen.add(style);
    styles.push(style);
    if (styles.length >= 4) break;
  }
  const count = reviews.length;
  const rating =
    count === 0
      ? 0
      : Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / count) * 10) / 10;
  const coverUrl = items[0]?.imageUrl ?? null;
  return {
    artist: {
      id: featured.id,
      name: featured.name,
      username: null,
      initial: featured.initial,
      avatarUrl: featured.avatarUrl,
      coverUrl,
      cidade: null,
      estado: null,
      studio: null,
      kycApproved: true,
      bookingEnabled: false,
      rating,
      reviewCount: count,
      styles,
    },
    items,
    scheduleSummary: [],
    availableSlots: [],
  };
}

function uniqueStyles(rows: { estilo: string }[]): string[] {
  const seen = new Set<string>();
  const styles: string[] = [];
  for (const row of rows) {
    const style = row.estilo?.trim();
    if (!style || seen.has(style)) continue;
    seen.add(style);
    styles.push(style);
    if (styles.length >= 4) break;
  }
  return styles;
}

export async function getPublicArtistVitrine(artistIdRaw: string): Promise<PublicArtistVitrine> {
  const identifier = artistIdRaw.trim();
  const featured = featuredMockVitrine(identifier);
  if (featured) return featured;
  const byId = isArtistId(identifier);
  const username = byId
    ? null
    : normalizeUsername(identifier).slice(0, USERNAME_MAX_LENGTH);
  if (!byId && (!username || !USERNAME_PATTERN.test(username))) {
    throw new ArtistVitrineError(400, 'Identificador de artista inválido.');
  }

  const artist = await prisma.perfil.findFirst({
    where: {
      ...(byId ? { id: identifier } : { username }),
      deleted_at: null,
      role: 'tatuador',
      statusConta: 'ATIVO',
    },
    select: {
      id: true,
      nome: true,
      username: true,
      cidade: true,
      estado: true,
      kyc_status: true,
      agenda_bloqueada: true,
      studio: {
        select: { id: true, nome: true },
      },
    },
  });

  if (!artist) {
    throw new ArtistVitrineError(404, 'Artista não encontrado.');
  }

  const artistId = artist.id;

  const rows = await prisma.portfolio.findMany({
    where: { tatuador_id: artistId, deleted_at: null },
    select: {
      id: true,
      tatuador_id: true,
      url_imagem: true,
      estilo: true,
      body_part: true,
      session_duration: true,
      is_healed: true,
      descricao: true,
      likes_count: true,
      created_at: true,
    },
    orderBy: { created_at: 'desc' },
    take: 48,
  });

  const name = artistName(artist.nome);
  const studioName = (artist.studio?.nome ?? '').trim();
  const kycApproved = artist.kyc_status === 'aprovado';
  const bookingEnabled = kycApproved && !artist.agenda_bloqueada;
  let scheduleSummary: PublicArtistScheduleSummary[] = [];
  let availableSlots: string[] = [];
  let rating = 0;
  let reviewCount = 0;
  try {
    const [schedule, reviews] = await Promise.all([
      getArtistSchedule(artistId),
      getArtistReviews(artistId),
    ]);
    scheduleSummary = summarizeSchedule(schedule.schedule);
    if (bookingEnabled) {
      availableSlots = listUpcomingSlots(schedule.schedule, {
        days: 14,
        intervalMinutes: 60,
        limit: 12,
      });
    }
    rating = reviews.summary.averageRating;
    reviewCount = reviews.summary.count;
  } catch {
    scheduleSummary = [];
    availableSlots = [];
  }

  return {
    artist: {
      id: artist.id,
      name,
      username: artist.username,
      initial: artistInitial(name),
      avatarUrl: rows[0]?.url_imagem ?? null,
      coverUrl: rows[1]?.url_imagem ?? rows[0]?.url_imagem ?? null,
      cidade: artist.cidade,
      estado: artist.estado,
      studio: artist.studio ? { id: artist.studio.id, name: studioName || '' } : null,
      kycApproved,
      bookingEnabled,
      rating,
      reviewCount,
      styles: uniqueStyles(rows),
    },
    items: rows.map((row) => ({
      id: row.id,
      tatuadorId: row.tatuador_id,
      imageUrl: row.url_imagem,
      style: row.estilo,
      bodyPart: row.body_part,
      sessionDuration: row.session_duration,
      isHealed: row.is_healed,
      createdAt: row.created_at.toISOString(),
      likesCount: row.likes_count,
      descricao: row.descricao,
    })),
    scheduleSummary,
    availableSlots,
  };
}
