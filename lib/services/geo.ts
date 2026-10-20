import { prisma } from '@/lib/prisma';
import { PLACEHOLDER_NEARBY_ARTISTS } from '@/lib/geo-mock';
import type { GeoAddress, NearbyArtistDto, NearbyArtistsPayload } from '@/lib/types/geo';

export class GeoError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'GeoError';
  }
}

const EARTH_RADIUS_KM = 6371;
const DEFAULT_RADIUS_KM = 15;
const MIN_RADIUS_KM = 1;
const MAX_RADIUS_KM = 80;
const MAX_RESULTS = 40;
const KM_PER_DEG_LAT = 110.574;

type GeoRow = {
  id: string;
  nome: string | null;
  role: string;
  latitude: number | null;
  longitude: number | null;
  address: unknown;
  cidade: string | null;
  estado: string | null;
};

function toMapRole(role: string): 'tatuador' | 'estudio' | null {
  if (role === 'tatuador' || role === 'estudio') return role;
  return null;
}

function clampRadius(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_RADIUS_KM;
  return Math.min(MAX_RADIUS_KM, Math.max(MIN_RADIUS_KM, numeric));
}

function parseCoordinate(value: unknown, label: string): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    throw new GeoError(400, `${label} inválida.`);
  }
  return numeric;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function boundingBox(lat: number, lng: number, radiusKm: number) {
  const latDelta = radiusKm / KM_PER_DEG_LAT;
  const lngDelta = radiusKm / (111.32 * Math.cos(toRad(lat)) || 1);
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}

export function parseAddress(raw: unknown, fallbackCity: string | null, fallbackState: string | null): GeoAddress | null {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const record = raw as Record<string, unknown>;
    const street = typeof record.street === 'string' ? record.street.trim() : '';
    const city = typeof record.city === 'string' ? record.city.trim() : fallbackCity?.trim() || '';
    const state = typeof record.state === 'string' ? record.state.trim() : fallbackState?.trim() || '';
    const zip = typeof record.zip === 'string' ? record.zip.trim() : '';
    if (street || city || state || zip) {
      return { street, city, state, zip };
    }
  }
  if (fallbackCity || fallbackState) {
    return {
      street: '',
      city: fallbackCity ?? '',
      state: fallbackState ?? '',
      zip: '',
    };
  }
  return null;
}

function artistName(nome: string | null): string {
  const trimmed = (nome ?? '').trim();
  return trimmed || '';
}

function artistInitial(name: string): string {
  const letter = name.charAt(0);
  return letter ? letter.toUpperCase() : 'A';
}

function toNearbyArtist(
  row: GeoRow,
  originLat: number,
  originLng: number
): NearbyArtistDto | null {
  if (row.latitude == null || row.longitude == null) return null;
  const role = toMapRole(row.role);
  if (!role) return null;
  const name = artistName(row.nome);
  return {
    id: row.id,
    name,
    role,
    avatarUrl: null,
    initial: artistInitial(name),
    latitude: row.latitude,
    longitude: row.longitude,
    address: parseAddress(row.address, row.cidade, row.estado),
    distanceKm: Math.round(haversineKm(originLat, originLng, row.latitude, row.longitude) * 10) / 10,
  };
}

function mockNearby(userLat: number, userLng: number, radiusKm: number): NearbyArtistDto[] {
  return PLACEHOLDER_NEARBY_ARTISTS.map((artist) => ({
    ...artist,
    distanceKm: Math.round(haversineKm(userLat, userLng, artist.latitude, artist.longitude) * 10) / 10,
  }))
    .filter((artist) => artist.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, MAX_RESULTS);
}

export async function getNearbyArtists(
  userLatRaw: unknown,
  userLngRaw: unknown,
  radiusRaw?: unknown
): Promise<NearbyArtistsPayload> {
  const userLat = parseCoordinate(userLatRaw, 'Latitude');
  const userLng = parseCoordinate(userLngRaw, 'Longitude');
  if (userLat < -90 || userLat > 90 || userLng < -180 || userLng > 180) {
    throw new GeoError(400, 'Coordenadas fora do intervalo válido.');
  }
  const radiusKm = clampRadius(radiusRaw);
  const box = boundingBox(userLat, userLng, radiusKm);

  try {
    const rows = await prisma.perfil.findMany({
      where: {
        deleted_at: null,
        statusConta: 'ATIVO',
        role: { in: ['tatuador', 'estudio'] },
        latitude: { not: null, gte: box.minLat, lte: box.maxLat },
        longitude: { not: null, gte: box.minLng, lte: box.maxLng },
      },
      select: {
        id: true,
        nome: true,
        role: true,
        latitude: true,
        longitude: true,
        address: true,
        cidade: true,
        estado: true,
      },
      take: 120,
    });

    const artists = rows
      .map((row) => toNearbyArtist(row, userLat, userLng))
      .filter((item): item is NearbyArtistDto => item != null && item.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, MAX_RESULTS);

    return {
      origin: { latitude: userLat, longitude: userLng },
      radiusKm,
      artists: artists.length > 0 ? artists : mockNearby(userLat, userLng, radiusKm),
    };
  } catch {
    return {
      origin: { latitude: userLat, longitude: userLng },
      radiusKm,
      artists: mockNearby(userLat, userLng, radiusKm),
    };
  }
}
