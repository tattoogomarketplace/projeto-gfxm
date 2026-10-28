'use client';

import { useParams } from 'next/navigation';
import { ArtistVitrineScreen } from '@/components/features/artist-vitrine-screen';

export default function ArtistProfilePage() {
  const params = useParams<{ username: string }>();
  const username =
    typeof params.username === 'string' ? decodeURIComponent(params.username) : '';
  return <ArtistVitrineScreen identifier={username} />;
}
