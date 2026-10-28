'use client';

import { useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { bearerHeaders } from '@/lib/query/auth-headers';
import { QueryHttpError } from '@/lib/query/http-error';
import { queryKeys } from '@/lib/query/keys';
import { TAB_SWR } from '@/lib/query/swr';
import { SAO_PAULO_ORIGIN } from '@/lib/map-pins';
import type { NearbyArtistsPayload } from '@/lib/types/geo';

const DEFAULT_RADIUS_KM = 25;

async function fetchNearbyArtists(
  lat: number,
  lng: number,
  radius: number,
  getToken: () => Promise<string | null>
): Promise<NearbyArtistsPayload> {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    radius: String(radius),
  });
  const res = await fetch(`/api/artistas/nearby?${params.toString()}`, {
    headers: await bearerHeaders(getToken),
    cache: 'no-store',
  });
  const payload = (await res.json().catch(() => ({}))) as NearbyArtistsPayload & {
    sucesso?: boolean;
    erro?: string;
  };
  if (!res.ok || payload.sucesso === false) {
    throw new QueryHttpError(res.status || 500, payload.erro || 'Falha ao localizar artistas próximos.');
  }
  return {
    origin: payload.origin ?? { latitude: lat, longitude: lng },
    radiusKm: payload.radiusKm ?? radius,
    artists: Array.isArray(payload.artists) ? payload.artists : [],
  };
}

export function useNearbyArtists(
  lat = SAO_PAULO_ORIGIN.latitude,
  lng = SAO_PAULO_ORIGIN.longitude,
  radius = DEFAULT_RADIUS_KM
) {
  const { getToken } = useAuth();
  const tokenFn = useCallback(() => getToken({ skipCache: true }), [getToken]);

  return useQuery({
    queryKey: queryKeys.nearbyArtists(lat, lng, radius),
    queryFn: () => fetchNearbyArtists(lat, lng, radius, tokenFn),
    ...TAB_SWR,
  });
}
