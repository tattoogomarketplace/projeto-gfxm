'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { ReviewDto } from '@/lib/types/review';

async function fetchFeaturedReviews(): Promise<ReviewDto[]> {
  const res = await fetch('/api/reviews/featured', { cache: 'no-store' });
  const payload = (await res.json().catch(() => ({}))) as {
    sucesso?: boolean;
    reviews?: ReviewDto[];
    erro?: string;
  };

  if (!res.ok || payload.sucesso === false) {
    throw new Error(payload.erro || 'home.noFeaturedReviews');
  }

  return Array.isArray(payload.reviews) ? payload.reviews : [];
}

export function useFeaturedReviews() {
  return useQuery({
    queryKey: ['reviews', 'featured'],
    queryFn: fetchFeaturedReviews,
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  });
}
