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
    <div className="relative flex h-full max-h-full min-h-0 w-full flex-col overflow-hidden bg-transparent text-neutral-900 dark:text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(120%_100%_at_50%_0%,rgba(249,115,22,0.18),transparent_65%)]"
      />
      <div className="relative flex-1 overflow-y-auto min-h-0 pb-48 px-4 pt-5 [-webkit-overflow-scrolling:touch]">
        <GaleriaInspiracoes
          onStartConversation={(tatuadorId, artworkId) => {
            setPendingChatPeer(tatuadorId);
            setPendingChatArtwork(artworkId);
            setActiveTab('chat');
            const params = new URLSearchParams({ artistId: tatuadorId, artworkId });
            router.push(`/dashboard/chat?${params.toString()}`);
          }}
        />
      </div>
    </div>
  );
}
