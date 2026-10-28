'use client';

import { useParams } from 'next/navigation';
import { PublicProfileRouteScreen } from '@/components/features/public-profile-route-screen';

export default function PublicProfilePage() {
  const params = useParams<{ username: string }>();
  const username =
    typeof params.username === 'string' ? decodeURIComponent(params.username) : '';
  return <PublicProfileRouteScreen username={username} />;
}
