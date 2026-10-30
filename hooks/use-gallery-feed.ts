'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { InspirationItem } from '@/lib/gallery-mock';
import { DEFAULT_MEDIA_FILTER, type MediaFilter } from '@/lib/media-filter';
import { QueryHttpError } from '@/lib/query/http-error';
import { queryKeys } from '@/lib/query/keys';
import { TAB_SWR } from '@/lib/query/swr';

async function fetchGalleryFeed(media: MediaFilter): Promise<InspirationItem[]> {
  const params = new URLSearchParams({ media });
  const res = await fetch(`/api/feed?${params.toString()}`, { cache: 'no-store' });
  const payload = (await res.json().catch(() => ({}))) as {
    sucesso?: boolean;
    erro?: string;
    items?: InspirationItem[];
  };
  if (!res.ok || payload.sucesso === false) {
    throw new QueryHttpError(res.status || 500, payload.erro || 'Falha ao carregar o feed.');
  }
  return Array.isArray(payload.items) ? payload.items : [];
}

export function useGalleryFeed(media: MediaFilter = DEFAULT_MEDIA_FILTER) {
  return useQuery({
    queryKey: queryKeys.galleryFeed(media),
    queryFn: () => fetchGalleryFeed(media),
    placeholderData: keepPreviousData,
    ...TAB_SWR,
  });
}
