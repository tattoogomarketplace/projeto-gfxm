'use client';

import AvaliacoesClient from './avaliacoes-client';
import { DestinationListChrome } from '@/components/ui/deep-route-chrome';
import { useFeaturedReviews } from '@/hooks/use-featured-reviews';

export default function AvaliacoesPage() {
  const query = useFeaturedReviews();
  if (query.isLoading && !query.data) return <DestinationListChrome />;
  return <AvaliacoesClient />;
}
