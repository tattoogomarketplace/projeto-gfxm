import { REVIEW_FEATURED_ARTISTS } from '@/lib/review-mock';
import type { GeoAddress, NearbyArtistDto } from '@/lib/types/geo';

type FeaturedArtistGeo = {
  latitude: number;
  longitude: number;
  address: GeoAddress;
};

export const FEATURED_ARTIST_GEO: Record<
  keyof typeof REVIEW_FEATURED_ARTISTS,
  FeaturedArtistGeo
> = {
  marina: {
    latitude: -23.54648,
    longitude: -46.69112,
    address: {
      street: 'Rua Harmonia, 412',
      city: 'São Paulo',
      state: 'SP',
      zip: '05435-000',
    },
  },
  rafael: {
    latitude: -23.56141,
    longitude: -46.65588,
    address: {
      street: 'Rua Augusta, 1508',
      city: 'São Paulo',
      state: 'SP',
      zip: '01304-001',
    },
  },
  bianca: {
    latitude: -23.60192,
    longitude: -46.67248,
    address: {
      street: 'Av. Ibirapuera, 3103',
      city: 'São Paulo',
      state: 'SP',
      zip: '04029-200',
    },
  },
  diego: {
    latitude: -23.55821,
    longitude: -46.63472,
    address: {
      street: 'Rua da Glória, 266',
      city: 'São Paulo',
      state: 'SP',
      zip: '01510-000',
    },
  },
  camila: {
    latitude: -23.58562,
    longitude: -46.67391,
    address: {
      street: 'Rua Joaquim Floriano, 466',
      city: 'São Paulo',
      state: 'SP',
      zip: '04534-002',
    },
  },
};

export const PLACEHOLDER_NEARBY_ARTISTS: Omit<NearbyArtistDto, 'distanceKm'>[] = (
  Object.keys(FEATURED_ARTIST_GEO) as Array<keyof typeof FEATURED_ARTIST_GEO>
).map((key) => {
  const artist = REVIEW_FEATURED_ARTISTS[key];
  const geo = FEATURED_ARTIST_GEO[key];
  return {
    id: artist.id,
    name: artist.name,
    role: artist.role,
    avatarUrl: artist.avatarUrl,
    initial: artist.initial,
    latitude: geo.latitude,
    longitude: geo.longitude,
    address: geo.address,
  };
});
