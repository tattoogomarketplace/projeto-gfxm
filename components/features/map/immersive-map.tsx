'use client';

import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ArtistMapSheet } from '@/components/features/map/artist-map-sheet';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import type { MapArtistPin } from '@/lib/map-pins';

const Map = dynamic(() => import('./map-canvas'), { ssr: false });

type ImmersiveMapProps = {
  origin: { latitude: number; longitude: number };
  artists: MapArtistPin[];
};

export function ImmersiveMap({ origin, artists }: ImmersiveMapProps) {
  const router = useRouter();
  const { t } = useI18n();
  const { triggerHaptic } = useHapticFeedback();
  const [selectedArtist, setSelectedArtist] = useState<MapArtistPin | null>(null);

  const goBack = () => {
    triggerHaptic('light');
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/dashboard');
  };

  const selectArtist = useCallback(
    (artist: MapArtistPin) => {
      triggerHaptic('medium');
      setSelectedArtist(artist);
    },
    [triggerHaptic]
  );

  return (
    <div className="relative z-0 h-[100dvh] w-full overflow-hidden bg-zinc-950">
      <Map
        origin={origin}
        artists={artists}
        selectedId={selectedArtist?.id ?? null}
        onSelect={selectArtist}
      />
      <header className="absolute inset-x-0 top-0 z-40 bg-zinc-950/70 safe-header-pad backdrop-blur-md">
        <div className="flex min-h-11 items-center gap-3 px-4 pb-3">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex min-h-11 min-w-11 items-center gap-2 rounded-xl px-1 text-sm font-semibold text-zinc-300 transition-colors hover:text-orange-300"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.9} />
            {t('common.back')}
          </button>
          <h1 className="min-w-0 flex-1 truncate text-[17px] font-semibold tracking-tight text-white">
            {t('home.exploreRegion')}
          </h1>
        </div>
      </header>
      <ArtistMapSheet artist={selectedArtist} onClose={() => setSelectedArtist(null)} />
    </div>
  );
}
