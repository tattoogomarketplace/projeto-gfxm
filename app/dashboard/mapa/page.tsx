'use client';

import { ImmersiveMap } from '@/components/features/map/immersive-map';
import { MapChrome } from '@/components/ui/deep-route-chrome';
import { useNearbyArtists } from '@/hooks/use-nearby-artists';
import { SAO_PAULO_ORIGIN, toMapArtistPins } from '@/lib/map-pins';

export default function MapaPage() {
  const query = useNearbyArtists(
    SAO_PAULO_ORIGIN.latitude,
    SAO_PAULO_ORIGIN.longitude,
    25
  );

  if (query.data) {
    return (
      <ImmersiveMap
        origin={query.data.origin}
        artists={toMapArtistPins(query.data.artists)}
      />
    );
  }

  if (query.isError) {
    return (
      <ImmersiveMap
        origin={SAO_PAULO_ORIGIN}
        artists={[]}
      />
    );
  }

  return <MapChrome />;
}
