'use client';

import { useUser } from '@clerk/nextjs';
import { useRouteTab } from '@/hooks/use-route-tab';
import { ChatWorkspace } from '@/components/features/chat/chat-workspace';
import { AgendaPaymentsWorkspace } from '@/components/features/agenda-payments-workspace';
import { ArtistStudioHub } from '@/components/features/artist-hub/artist-studio-hub';
import type { AppTab } from '@/hooks/use-ui-store';
import type { AppRole } from '@/lib/utils/auth-redirect';

export default function TatuadorDashboard({
  role = 'tatuador',
  initialTab = 'portfolio',
}: {
  role?: AppRole;
  initialTab?: AppTab;
}) {
  const { user } = useUser();
  // Geometria derivada da rota, resolvida de forma síncrona no SSR e no cliente.
  const activeTab = useRouteTab(initialTab);

  return (
    <div className="flex w-full flex-1 flex-col bg-transparent pt-5 text-gray-900 transition-opacity duration-300 ease-in-out dark:text-white">
      {activeTab === 'portfolio' ? (
        <section key="portfolio" className="min-w-0 w-full">
          <ArtistStudioHub tatuadorId={user?.id} artistName={user?.fullName ?? ''} />
        </section>
      ) : null}

      {activeTab === 'agendar' ? (
        <section key="agendar" className="flex min-h-0 min-w-0 w-full flex-1 flex-col">
          <AgendaPaymentsWorkspace role={role} />
        </section>
      ) : null}

      {activeTab === 'chat' ? (
        <section
          key="chat"
          className="-mx-4 min-h-0 flex-1 transform-gpu transition-opacity duration-200 sm:-mx-6"
        >
          <ChatWorkspace />
        </section>
      ) : null}
    </div>
  );
}
