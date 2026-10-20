import { ImmersiveMap } from '@/components/features/map/immersive-map';
import { SessionHydrating } from '@/components/features/session-hydrating';
import { SAO_PAULO_ORIGIN, toMapArtistPins } from '@/lib/map-pins';
import { getNearbyArtists } from '@/lib/services/geo';
import { requireDashboardPerfil } from '@/lib/utils/dashboard-gate';
import { rethrowNextControlFlow } from '@/lib/utils/next-control-flow';

export default async function MapaPage() {
  let authenticated = false;
  try {
    const session = await requireDashboardPerfil();
    authenticated = Boolean(session);
  } catch (error) {
    rethrowNextControlFlow(error);
    authenticated = false;
  }
  if (!authenticated) return <SessionHydrating />;

  const nearby = await getNearbyArtists(
    SAO_PAULO_ORIGIN.latitude,
    SAO_PAULO_ORIGIN.longitude,
    25
  );

  return (
    <ImmersiveMap
      origin={nearby.origin}
      artists={toMapArtistPins(nearby.artists)}
    />
  );
}
