'use client';

import GaleriaClient from './galeria-client';
import { GaleriaChrome } from '@/components/ui/deep-route-chrome';
import { useGalleryFeed } from '@/hooks/use-gallery-feed';
import { useSavedInspirationIds } from '@/hooks/use-saved-inspirations';

export default function GaleriaPage() {
  const feedQuery = useGalleryFeed();
  const savedQuery = useSavedInspirationIds();
  const showChrome =
    (feedQuery.isLoading && !feedQuery.data) ||
    (savedQuery.isLoading && !savedQuery.data && !feedQuery.data);

  if (showChrome) return <GaleriaChrome />;

  return (
    <div className="absolute inset-0 z-0 min-h-0 w-full overflow-x-hidden overflow-y-auto overscroll-none bg-[#0a0a0c] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-950/20 via-[#0a0a0c] to-[#050505] pb-[var(--dock-clearance)] [-webkit-overflow-scrolling:touch]">
      <GaleriaClient
        feedItems={feedQuery.data ?? []}
        savedIds={savedQuery.data ?? []}
      />
    </div>
  );
}
