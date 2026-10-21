import { prisma } from '@/lib/prisma';
import { resolvePortfolioLocation } from '@/lib/portfolio-metadata';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const FALLBACK_MIN = 800;
const FALLBACK_MAX = 1200;
const MIN_SAMPLE = 3;
const CHEAPER_LIMIT = 3;
const THUMBNAIL_LIMIT = 3;

export class BudgetEstimatorError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'BudgetEstimatorError';
  }
}

export type BudgetEstimateInput = {
  style?: string | null;
  location?: string | null;
  artistId?: string | null;
  artworkId?: string | null;
  artistName?: string | null;
};

export type BudgetEstimateDto = {
  style: string;
  location: string;
  artistName: string;
  artistId: string | null;
  artworkId: string | null;
  imageUrl: string | null;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  sampleSize: number;
  usedFallback: boolean;
  rangeLabel: string;
};

export type CheaperArtistsInput = {
  style?: string | null;
  styleId?: string | null;
  currentArtistId?: string | null;
  maxPriceLimit?: number | null;
  location?: string | null;
};

export type CheaperArtistDto = {
  id: string;
  name: string;
  username: string | null;
  location: string;
  style: string;
  avatarUrl: string | null;
  savingsLabel: string;
  savingsPercent: number;
  priceRange: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  thumbnails: string[];
};

type GeoFilter = {
  cidade?: string;
  estado?: string;
};

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof value === 'object' && 'toNumber' in value) {
    const parsed = (value as { toNumber: () => number }).toNumber();
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.max(50, Math.round(value / 10) * 10);
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(roundMoney(value));
}

export function formatPriceRange(minPrice: number, maxPrice: number): string {
  const min = roundMoney(minPrice);
  const max = roundMoney(Math.max(min, maxPrice));
  return `${formatBRL(min)} - ${formatBRL(max)}`;
}

function artistDisplayName(nome: string | null | undefined, fallback = 'Artista'): string {
  const trimmed = (nome ?? '').trim();
  return trimmed || fallback;
}

function parseLocation(location?: string | null): GeoFilter {
  const raw = readString(location);
  if (!raw) return {};
  const [cidade, estado] = raw.split('/').map((part) => part.trim());
  return {
    ...(cidade ? { cidade } : {}),
    ...(estado ? { estado } : {}),
  };
}

function formatLocation(cidade?: string | null, estado?: string | null): string {
  return (
    resolvePortfolioLocation({
      artistCity: cidade,
      artistState: estado,
    }) ?? ''
  );
}

function tatuadorGeoWhere(geo: GeoFilter) {
  if (!geo.cidade && !geo.estado) return {};
  return {
    ...(geo.cidade
      ? { cidade: { equals: geo.cidade, mode: 'insensitive' as const } }
      : {}),
    ...(geo.estado
      ? { estado: { equals: geo.estado, mode: 'insensitive' as const } }
      : {}),
  };
}

function activeArtistWhere(extra: Record<string, unknown> = {}) {
  return {
    deleted_at: null,
    role: 'tatuador' as const,
    statusConta: 'ATIVO' as const,
    ...extra,
  };
}

function bookingWhere(artistFilter: Record<string, unknown>) {
  return {
    deleted_at: null,
    status: { not: 'cancelado' as const },
    tatuador: artistFilter,
  };
}

async function resolveContext(input: BudgetEstimateInput): Promise<{
  style: string;
  location: string;
  artistName: string;
  artistId: string | null;
  artworkId: string | null;
  imageUrl: string | null;
}> {
  let style = readString(input.style);
  let location = readString(input.location);
  let artistName = artistDisplayName(input.artistName);
  let artistId = readString(input.artistId) || null;
  let artworkId = readString(input.artworkId) || null;
  let imageUrl: string | null = null;

  if (artworkId && isUuid(artworkId)) {
    const artwork = await prisma.portfolio.findFirst({
      where: { id: artworkId, deleted_at: null },
      select: {
        id: true,
        url_imagem: true,
        estilo: true,
        tatuador_id: true,
        tatuador: {
          select: {
            id: true,
            nome: true,
            cidade: true,
            estado: true,
            studio: { select: { cidade: true, estado: true } },
          },
        },
      },
    });
    if (artwork) {
      artworkId = artwork.id;
      imageUrl = artwork.url_imagem;
      style = artwork.estilo || style;
      artistId = artwork.tatuador_id;
      artistName = artistDisplayName(artwork.tatuador.nome, artistName);
      location =
        resolvePortfolioLocation({
          studioCity: artwork.tatuador.studio?.cidade,
          studioState: artwork.tatuador.studio?.estado,
          artistCity: artwork.tatuador.cidade,
          artistState: artwork.tatuador.estado,
        }) || location;
    }
  } else if (artistId && isUuid(artistId)) {
    const artist = await prisma.perfil.findFirst({
      where: activeArtistWhere({ id: artistId }),
      select: {
        id: true,
        nome: true,
        cidade: true,
        estado: true,
        studio: { select: { cidade: true, estado: true } },
      },
    });
    if (artist) {
      artistId = artist.id;
      artistName = artistDisplayName(artist.nome, artistName);
      location =
        resolvePortfolioLocation({
          studioCity: artist.studio?.cidade,
          studioState: artist.studio?.estado,
          artistCity: artist.cidade,
          artistState: artist.estado,
        }) || location;
    }
  }

  return {
    style: style || 'Realismo',
    location: location || 'Brasil',
    artistName,
    artistId: artistId && isUuid(artistId) ? artistId : artistId,
    artworkId: artworkId && isUuid(artworkId) ? artworkId : artworkId,
    imageUrl,
  };
}

async function aggregateMarket(style: string, geo: GeoFilter) {
  const styleFilter = style
    ? {
        portfolios: {
          some: {
            deleted_at: null,
            estilo: { equals: style, mode: 'insensitive' as const },
          },
        },
      }
    : {};

  const run = (geoFilter: GeoFilter) =>
    prisma.agendamento.aggregate({
      where: bookingWhere(activeArtistWhere({ ...styleFilter, ...tatuadorGeoWhere(geoFilter) })),
      _avg: { valor_total: true },
      _min: { valor_total: true },
      _max: { valor_total: true },
      _count: { _all: true },
    });

  const local = await run(geo);
  if (local._count._all >= MIN_SAMPLE) return local;
  if (geo.cidade || geo.estado) {
    const regional = await run({});
    if (regional._count._all > local._count._all) return regional;
  }
  return local;
}

function toEstimatePrices(stats: {
  _avg: { valor_total: unknown };
  _min: { valor_total: unknown };
  _max: { valor_total: unknown };
  _count: { _all: number };
}): Pick<BudgetEstimateDto, 'minPrice' | 'maxPrice' | 'avgPrice' | 'sampleSize' | 'usedFallback'> {
  const sampleSize = stats._count._all;
  if (sampleSize < 1) {
    return {
      minPrice: FALLBACK_MIN,
      maxPrice: FALLBACK_MAX,
      avgPrice: Math.round((FALLBACK_MIN + FALLBACK_MAX) / 2),
      sampleSize: 0,
      usedFallback: true,
    };
  }

  const avgPrice = roundMoney(toNumber(stats._avg.valor_total) || (FALLBACK_MIN + FALLBACK_MAX) / 2);
  const minPrice = roundMoney(toNumber(stats._min.valor_total) || avgPrice * 0.8);
  const maxPrice = roundMoney(toNumber(stats._max.valor_total) || avgPrice * 1.2);
  const usedFallback = sampleSize < MIN_SAMPLE;

  return {
    minPrice: usedFallback ? roundMoney(Math.min(minPrice, FALLBACK_MIN)) : minPrice,
    maxPrice: usedFallback ? roundMoney(Math.max(maxPrice, FALLBACK_MAX)) : Math.max(minPrice, maxPrice),
    avgPrice,
    sampleSize,
    usedFallback,
  };
}

export async function getBudgetEstimate(input: BudgetEstimateInput): Promise<BudgetEstimateDto> {
  const context = await resolveContext(input);
  const geo = parseLocation(context.location);
  const stats = await aggregateMarket(context.style, geo);
  const prices = toEstimatePrices(stats);

  return {
    ...context,
    ...prices,
    rangeLabel: formatPriceRange(prices.minPrice, prices.maxPrice),
  };
}

type ArtistPriceRow = {
  tatuador_id: string;
  _avg: { valor_total: unknown };
  _min: { valor_total: unknown };
  _max: { valor_total: unknown };
  _count: { _all: number };
};

async function listArtistPriceTiers(style: string, excludeArtistId?: string | null): Promise<ArtistPriceRow[]> {
  const rows = await prisma.agendamento.groupBy({
    by: ['tatuador_id'],
    where: bookingWhere(
      activeArtistWhere({
        kyc_status: 'aprovado',
        ...(excludeArtistId && isUuid(excludeArtistId) ? { id: { not: excludeArtistId } } : {}),
        ...(style
          ? {
              portfolios: {
                some: {
                  deleted_at: null,
                  estilo: { equals: style, mode: 'insensitive' as const },
                },
              },
            }
          : {}),
      })
    ),
    _avg: { valor_total: true },
    _min: { valor_total: true },
    _max: { valor_total: true },
    _count: { _all: true },
  });

  return rows.filter((row) => toNumber(row._avg.valor_total) > 0);
}

export async function getCheaperArtists(input: CheaperArtistsInput): Promise<CheaperArtistDto[]> {
  const style = readString(input.styleId) || readString(input.style);
  if (!style) return [];

  const currentArtistId = readString(input.currentArtistId) || null;
  const baseline =
    typeof input.maxPriceLimit === 'number' && Number.isFinite(input.maxPriceLimit) && input.maxPriceLimit > 0
      ? input.maxPriceLimit
      : 0;

  const estimate = await getBudgetEstimate({
    style,
    location: input.location,
    artistId: currentArtistId,
  });
  const maxPriceLimit = baseline || estimate.avgPrice || FALLBACK_MAX;

  const tiers = await listArtistPriceTiers(style, currentArtistId);
  const cheaper = tiers
    .map((row) => {
      const avgPrice = roundMoney(toNumber(row._avg.valor_total));
      const minPrice = roundMoney(toNumber(row._min.valor_total) || avgPrice * 0.85);
      const maxPrice = roundMoney(toNumber(row._max.valor_total) || avgPrice * 1.15);
      const savingsPercent = maxPriceLimit > 0 ? Math.round((1 - avgPrice / maxPriceLimit) * 100) : 0;
      return {
        tatuadorId: row.tatuador_id,
        avgPrice,
        minPrice,
        maxPrice,
        savingsPercent,
      };
    })
    .filter((row) => row.avgPrice > 0 && row.avgPrice < maxPriceLimit && row.savingsPercent >= 2)
    .sort((a, b) => a.avgPrice - b.avgPrice || b.savingsPercent - a.savingsPercent)
    .slice(0, CHEAPER_LIMIT);

  if (cheaper.length === 0) return [];

  const ids = cheaper.map((row) => row.tatuadorId);
  const [artists, portfolios] = await Promise.all([
    prisma.perfil.findMany({
      where: {
        id: { in: ids },
        ...activeArtistWhere({ kyc_status: 'aprovado' }),
      },
      select: {
        id: true,
        nome: true,
        username: true,
        cidade: true,
        estado: true,
        studio: { select: { cidade: true, estado: true } },
      },
    }),
    prisma.portfolio.findMany({
      where: {
        tatuador_id: { in: ids },
        deleted_at: null,
        estilo: { equals: style, mode: 'insensitive' },
      },
      select: {
        tatuador_id: true,
        url_imagem: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    }),
  ]);

  const artistById = new Map(artists.map((artist) => [artist.id, artist]));
  const thumbsByArtist = new Map<string, string[]>();
  for (const row of portfolios) {
    const list = thumbsByArtist.get(row.tatuador_id) ?? [];
    if (list.length >= THUMBNAIL_LIMIT) continue;
    if (!row.url_imagem || list.includes(row.url_imagem)) continue;
    list.push(row.url_imagem);
    thumbsByArtist.set(row.tatuador_id, list);
  }

  return cheaper.flatMap((row) => {
    const artist = artistById.get(row.tatuadorId);
    if (!artist) return [];
    const thumbnails = thumbsByArtist.get(artist.id) ?? [];
    const location =
      resolvePortfolioLocation({
        studioCity: artist.studio?.cidade,
        studioState: artist.studio?.estado,
        artistCity: artist.cidade,
        artistState: artist.estado,
      }) || formatLocation(artist.cidade, artist.estado);
    const savingsPercent = Math.max(2, row.savingsPercent);
    return [
      {
        id: artist.id,
        name: artistDisplayName(artist.nome),
        username: artist.username ?? null,
        location: location || estimate.location,
        style,
        avatarUrl: thumbnails[0] ?? null,
        savingsLabel: `~${savingsPercent}% menor`,
        savingsPercent,
        priceRange: formatPriceRange(row.minPrice, row.maxPrice),
        avgPrice: row.avgPrice,
        minPrice: row.minPrice,
        maxPrice: row.maxPrice,
        thumbnails,
      },
    ];
  });
}
