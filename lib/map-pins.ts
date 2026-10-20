import { PLACEHOLDER_REVIEWS } from '@/lib/review-mock';
import type { NearbyArtistDto } from '@/lib/types/geo';

export type MapArtistPin = NearbyArtistDto & {
  rating: number;
  style: string;
};

function reviewsFor(artistId: string) {
  return PLACEHOLDER_REVIEWS.filter((review) => review.targetId === artistId);
}

export function toMapArtistPin(artist: NearbyArtistDto): MapArtistPin {
  const reviews = reviewsFor(artist.id);
  const rating =
    reviews.length > 0
      ? Math.round(
          reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
        )
      : 5;
  const style = reviews.find((review) => review.portfolio?.style)?.portfolio?.style ?? '';
  return { ...artist, rating, style };
}

export function toMapArtistPins(artists: NearbyArtistDto[]): MapArtistPin[] {
  return artists.map(toMapArtistPin);
}

export function mapArtistProfileHref(artistId: string): string {
  if (!artistId || artistId.startsWith('ph-')) return '/dashboard/artistas';
  return `/dashboard/artista/${encodeURIComponent(artistId)}`;
}

export const SAO_PAULO_ORIGIN = {
  latitude: -23.55052,
  longitude: -46.63331,
} as const;
