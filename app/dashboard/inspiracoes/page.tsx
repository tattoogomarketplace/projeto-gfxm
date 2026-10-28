'use client';

import { SavedInspirationsGallery } from '@/components/features/saved-inspirations-gallery';
import { InspiracoesChrome } from '@/components/ui/deep-route-chrome';
import { useSavedInspirations } from '@/hooks/use-saved-inspirations';

export default function InspiracoesPage() {
  const query = useSavedInspirations();

  if (query.isLoading && !query.data) return <InspiracoesChrome />;

  return (
    <div className="absolute inset-0 z-0 min-h-0 w-full overflow-x-hidden overflow-y-auto overscroll-none bg-[#121212] pb-[calc(env(safe-area-inset-bottom)+5rem)] [-webkit-overflow-scrolling:touch]">
      <SavedInspirationsGallery items={query.data ?? []} />
    </div>
  );
}
