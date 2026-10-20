export type GeoAddress = {
  street: string;
  city: string;
  state: string;
  zip: string;
};

export type NearbyArtistDto = {
  id: string;
  name: string;
  role: 'tatuador' | 'estudio';
  avatarUrl: string | null;
  initial: string;
  latitude: number;
  longitude: number;
  address: GeoAddress | null;
  distanceKm: number;
};

export type NearbyArtistsPayload = {
  origin: { latitude: number; longitude: number };
  radiusKm: number;
  artists: NearbyArtistDto[];
};
