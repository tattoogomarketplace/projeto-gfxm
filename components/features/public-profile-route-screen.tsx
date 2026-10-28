'use client';

import { notFound } from 'next/navigation';
import { PublicProfileScreen } from '@/components/features/public-profile-screen';
import { PublicProfileChrome } from '@/components/ui/deep-route-chrome';
import { usePerfilEnsure } from '@/hooks/use-perfil-ensure';
import { usePublicProfile } from '@/hooks/use-public-profile';

export function PublicProfileRouteScreen({ username }: { username: string }) {
  const query = usePublicProfile(username);
  const ensure = usePerfilEnsure();
  const viewerUsername = ensure.data?.perfil?.username ?? null;

  if (query.data) {
    return <PublicProfileScreen data={query.data} viewerUsername={viewerUsername} />;
  }
  if (query.isError) notFound();
  return <PublicProfileChrome />;
}
