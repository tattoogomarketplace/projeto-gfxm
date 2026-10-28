'use client';

import { useParams } from 'next/navigation';
import { ReviewDetailScreen } from '@/components/features/review-detail-screen';

export default function ReviewDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === 'string' ? decodeURIComponent(params.id) : '';
  return <ReviewDetailScreen id={id} />;
}
