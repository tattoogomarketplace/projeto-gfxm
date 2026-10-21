const { prisma } = require("./prisma.service.cjs");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const FALLBACK_MIN = 800;
const FALLBACK_MAX = 1200;
const MIN_SAMPLE = 3;
const CHEAPER_LIMIT = 3;
const THUMBNAIL_LIMIT = 3;

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function isUuid(value) {
  return typeof value === "string" && UUID_RE.test(value);
}

function readString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function toNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && typeof value.toNumber === "function") {
    const parsed = value.toNumber();
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.max(50, Math.round(value / 10) * 10);
}

function formatBRL(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(roundMoney(value));
}

function formatPriceRange(minPrice, maxPrice) {
  const min = roundMoney(minPrice);
  const max = roundMoney(Math.max(min, maxPrice));
  return `${formatBRL(min)} - ${formatBRL(max)}`;
}

function artistDisplayName(nome, fallback) {
  const trimmed = typeof nome === "string" ? nome.trim() : "";
  return trimmed || fallback || "Artista";
}

function parseLocation(location) {
  const raw = readString(location);
  if (!raw) return {};
  const [cidade, estado] = raw.split("/").map((part) => part.trim());
  return {
    ...(cidade ? { cidade } : {}),
    ...(estado ? { estado } : {}),
  };
}

function formatLocation(cidade, estado) {
  const c = readString(cidade);
  const uf = readString(estado);
  if (c && uf) return `${c}/${uf}`;
  return c || uf || "";
}

function tatuadorGeoWhere(geo) {
  if (!geo.cidade && !geo.estado) return {};
  return {
    ...(geo.cidade ? { cidade: { equals: geo.cidade, mode: "insensitive" } } : {}),
    ...(geo.estado ? { estado: { equals: geo.estado, mode: "insensitive" } } : {}),
  };
}

function activeArtistWhere(extra) {
  return {
    deleted_at: null,
    role: "tatuador",
    statusConta: "ATIVO",
    ...(extra || {}),
  };
}

function bookingWhere(artistFilter) {
  return {
    deleted_at: null,
    status: { not: "cancelado" },
    tatuador: artistFilter,
  };
}

async function resolveContext(input) {
  let style = readString(input.style);
  let location = readString(input.location);
  let artistName = artistDisplayName(input.artistName, "Artista");
  let artistId = readString(input.artistId) || null;
  let artworkId = readString(input.artworkId) || null;
  let imageUrl = null;

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
        formatLocation(artwork.tatuador.studio?.cidade, artwork.tatuador.studio?.estado) ||
        formatLocation(artwork.tatuador.cidade, artwork.tatuador.estado) ||
        location;
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
        formatLocation(artist.studio?.cidade, artist.studio?.estado) ||
        formatLocation(artist.cidade, artist.estado) ||
        location;
    }
  }

  return {
    style: style || "Realismo",
    location: location || "Brasil",
    artistName,
    artistId,
    artworkId,
    imageUrl,
  };
}

async function aggregateMarket(style, geo) {
  const styleFilter = style
    ? {
        portfolios: {
          some: {
            deleted_at: null,
            estilo: { equals: style, mode: "insensitive" },
          },
        },
      }
    : {};

  const run = (geoFilter) =>
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

function toEstimatePrices(stats) {
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

async function getBudgetEstimate(input) {
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

async function listArtistPriceTiers(style, excludeArtistId) {
  const rows = await prisma.agendamento.groupBy({
    by: ["tatuador_id"],
    where: bookingWhere(
      activeArtistWhere({
        kyc_status: "aprovado",
        ...(excludeArtistId && isUuid(excludeArtistId) ? { id: { not: excludeArtistId } } : {}),
        ...(style
          ? {
              portfolios: {
                some: {
                  deleted_at: null,
                  estilo: { equals: style, mode: "insensitive" },
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

async function getCheaperArtists(input) {
  const style = readString(input.styleId) || readString(input.style);
  if (!style) return [];

  const currentArtistId = readString(input.currentArtistId) || null;
  const baseline =
    typeof input.maxPriceLimit === "number" && Number.isFinite(input.maxPriceLimit) && input.maxPriceLimit > 0
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
        ...activeArtistWhere({ kyc_status: "aprovado" }),
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
        estilo: { equals: style, mode: "insensitive" },
      },
      select: {
        tatuador_id: true,
        url_imagem: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
    }),
  ]);

  const artistById = new Map(artists.map((artist) => [artist.id, artist]));
  const thumbsByArtist = new Map();
  for (const row of portfolios) {
    const list = thumbsByArtist.get(row.tatuador_id) || [];
    if (list.length >= THUMBNAIL_LIMIT) continue;
    if (!row.url_imagem || list.includes(row.url_imagem)) continue;
    list.push(row.url_imagem);
    thumbsByArtist.set(row.tatuador_id, list);
  }

  return cheaper.flatMap((row) => {
    const artist = artistById.get(row.tatuadorId);
    if (!artist) return [];
    const thumbnails = thumbsByArtist.get(artist.id) || [];
    const location =
      formatLocation(artist.studio?.cidade, artist.studio?.estado) ||
      formatLocation(artist.cidade, artist.estado) ||
      estimate.location;
    const savingsPercent = Math.max(2, row.savingsPercent);
    return [
      {
        id: artist.id,
        name: artistDisplayName(artist.nome),
        username: artist.username || null,
        location,
        style,
        avatarUrl: thumbnails[0] || null,
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

function parseMaxPrice(value) {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw httpError(400, "maxPriceLimit inválido.");
  }
  return n;
}

async function estimate(query) {
  return getBudgetEstimate({
    style: readString(query.style),
    location: readString(query.location),
    artistId: readString(query.artistId ?? query.tatuadorId),
    artworkId: readString(query.artworkId ?? query.portfolioId),
    artistName: readString(query.artistName),
  });
}

async function cheaper(query) {
  return getCheaperArtists({
    style: readString(query.style ?? query.styleId),
    styleId: readString(query.styleId ?? query.style),
    currentArtistId: readString(query.currentArtistId ?? query.artistId),
    maxPriceLimit: parseMaxPrice(query.maxPriceLimit ?? query.maxPrice),
    location: readString(query.location),
  });
}

module.exports = { estimate, cheaper, getBudgetEstimate, getCheaperArtists };
