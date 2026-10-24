'use client';

import { useRouter } from 'next/navigation';
import { GaleriaInspiracoes } from '@/components/features/galeria-inspiracoes';
import { useUiStore } from '@/hooks/use-ui-store';
import type { InspirationItem } from '@/lib/gallery-mock';

export default function GaleriaClient({
  feedItems = [],
  savedIds = [],
}: {
  feedItems?: InspirationItem[];
  savedIds?: string[];
}) {
  const router = useRouter();
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const setPendingChatPeer = useUiStore((s) => s.setPendingChatPeer);
  const setPendingChatArtwork = useUiStore((s) => s.setPendingChatArtwork);

  return (
    <GaleriaInspiracoes
      items={feedItems}
      savedIds={savedIds}
      onStartConversation={(tatuadorId, artworkId) => {
        setPendingChatPeer(tatuadorId);
        setPendingChatArtwork(artworkId);
        setActiveTab('chat');
        const params = new URLSearchParams({ artistId: tatuadorId, artworkId });
        router.push(`/dashboard/chat?${params.toString()}`);
      }}
    />
  );
}
