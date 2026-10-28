'use client';

import { useQuery } from '@tanstack/react-query';
import { QueryHttpError } from '@/lib/query/http-error';
import { queryKeys } from '@/lib/query/keys';
import { TAB_SWR } from '@/lib/query/swr';
import type { ReviewDto } from '@/lib/types/review';

async function fetchReview(id: string): Promise<ReviewDto> {
  const res = await fetch(`/api/reviews/${encodeURIComponent(id)}`, { cache: 'no-store' });
  const payload = (await res.json().catch(() => ({}))) as {
    sucesso?: boolean;
    erro?: string;
    review?: ReviewDto;
  };
  if (!res.ok || payload.sucesso === false || !payload.review) {
    throw new QueryHttpError(res.status || 500, payload.erro || 'Falha ao carregar a avaliação.');
  }
  return payload.review;
}

export function useReview(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.reviewDetail(id ?? ''),
    queryFn: () => fetchReview(id!),
    enabled: Boolean(id),
    ...TAB_SWR,
  });
}
