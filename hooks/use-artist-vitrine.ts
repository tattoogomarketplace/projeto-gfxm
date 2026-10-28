'use client';

import { useQuery } from '@tanstack/react-query';
import { QueryHttpError } from '@/lib/query/http-error';
import { queryKeys } from '@/lib/query/keys';
import { TAB_SWR } from '@/lib/query/swr';
import type { PublicArtistVitrine } from '@/lib/services/artist-vitrine';

async function fetchArtistVitrine(identifier: string): Promise<PublicArtistVitrine> {
  const res = await fetch(`/api/artistas/${encodeURIComponent(identifier)}`, { cache: 'no-store' });
  const payload = (await res.json().catch(() => ({}))) as {
    sucesso?: boolean;
    erro?: string;
    artist?: PublicArtistVitrine['artist'];
    items?: PublicArtistVitrine['items'];
    reviews?: PublicArtistVitrine['reviews'];
    scheduleSummary?: PublicArtistVitrine['scheduleSummary'];
    availableSlots?: PublicArtistVitrine['availableSlots'];
  };
  if (!res.ok || payload.sucesso === false || !payload.artist) {
    throw new QueryHttpError(res.status || 500, payload.erro || 'Falha ao carregar a vitrine do artista.');
  }
  return {
    artist: payload.artist,
    items: Array.isArray(payload.items) ? payload.items : [],
    reviews: Array.isArray(payload.reviews) ? payload.reviews : [],
    scheduleSummary: Array.isArray(payload.scheduleSummary) ? payload.scheduleSummary : [],
    availableSlots: Array.isArray(payload.availableSlots) ? payload.availableSlots : [],
  };
}

export function useArtistVitrine(identifier: string | undefined) {
  return useQuery({
    queryKey: queryKeys.artistVitrine(identifier ?? ''),
    queryFn: () => fetchArtistVitrine(identifier!),
    enabled: Boolean(identifier),
    ...TAB_SWR,
  });
}
