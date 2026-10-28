'use client';

import { useQuery } from '@tanstack/react-query';
import type { InspirationItem } from '@/lib/gallery-mock';
import { QueryHttpError } from '@/lib/query/http-error';
import { queryKeys } from '@/lib/query/keys';
import { TAB_SWR } from '@/lib/query/swr';

async function fetchGalleryFeed(): Promise<InspirationItem[]> {
  const res = await fetch('/api/feed', { cache: 'no-store' });
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

export function useGalleryFeed() {
  return useQuery({
    queryKey: queryKeys.galleryFeed,
    queryFn: fetchGalleryFeed,
    ...TAB_SWR,
  });
}
