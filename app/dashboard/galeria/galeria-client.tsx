'use client';

import { useRouter } from 'next/navigation';
import { GaleriaInspiracoes } from '@/components/features/galeria-inspiracoes';
import { useUiStore } from '@/hooks/use-ui-store';

export default function GaleriaClient() {
  const router = useRouter();
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const setPendingChatPeer = useUiStore((s) => s.setPendingChatPeer);
  const setPendingChatArtwork = useUiStore((s) => s.setPendingChatArtwork);

  return (
    <GaleriaInspiracoes
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
