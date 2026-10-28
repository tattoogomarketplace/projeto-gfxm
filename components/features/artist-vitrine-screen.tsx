'use client';

import { notFound } from 'next/navigation';
import { ArtistVitrine } from '@/components/features/artist-vitrine';
import { ArtistVitrineChrome } from '@/components/ui/deep-route-chrome';
import { useArtistVitrine } from '@/hooks/use-artist-vitrine';

export function ArtistVitrineScreen({ identifier }: { identifier: string }) {
  const query = useArtistVitrine(identifier);

  if (query.data) return <ArtistVitrine vitrine={query.data} />;
  if (query.isError) notFound();
  return <ArtistVitrineChrome />;
}
