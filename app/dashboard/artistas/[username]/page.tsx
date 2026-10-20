import { notFound } from 'next/navigation';
import { ArtistVitrine } from '@/components/features/artist-vitrine';
import { SessionHydrating } from '@/components/features/session-hydrating';
import { ArtistVitrineError, getPublicArtistVitrine } from '@/lib/services/artist-vitrine';
import { requireDashboardPerfil } from '@/lib/utils/dashboard-gate';
import { rethrowNextControlFlow } from '@/lib/utils/next-control-flow';

type ArtistProfilePageProps = {
  params: Promise<{ username: string }>;
};

export default async function ArtistProfilePage({ params }: ArtistProfilePageProps) {
  let authenticated = false;
  try {
    const session = await requireDashboardPerfil();
    authenticated = Boolean(session);
  } catch (error) {
    rethrowNextControlFlow(error);
    authenticated = false;
  }
  if (!authenticated) return <SessionHydrating />;

  const { username } = await params;
  let vitrine = null;
  try {
    vitrine = await getPublicArtistVitrine(decodeURIComponent(username));
  } catch (error) {
    if (error instanceof ArtistVitrineError && (error.status === 404 || error.status === 400)) {
      notFound();
    }
    rethrowNextControlFlow(error);
    console.error('[dashboard/artistas/:username] falha ao carregar vitrine', error);
    notFound();
  }

  return <ArtistVitrine vitrine={vitrine} />;
}
