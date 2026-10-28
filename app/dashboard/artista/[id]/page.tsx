'use client';

import { useParams } from 'next/navigation';
import { ArtistVitrineScreen } from '@/components/features/artist-vitrine-screen';

export default function ArtistVitrinePage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === 'string' ? decodeURIComponent(params.id) : '';
  return <ArtistVitrineScreen identifier={id} />;
}
