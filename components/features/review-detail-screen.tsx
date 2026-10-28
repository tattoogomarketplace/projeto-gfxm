'use client';

import { notFound } from 'next/navigation';
import { ReviewDetail } from '@/components/features/review-detail';
import { ReviewDetailChrome } from '@/components/ui/deep-route-chrome';
import { useReview } from '@/hooks/use-review';

export function ReviewDetailScreen({ id }: { id: string }) {
  const query = useReview(id);

  if (query.data) return <ReviewDetail review={query.data} />;
  if (query.isError) notFound();
  return <ReviewDetailChrome />;
}
