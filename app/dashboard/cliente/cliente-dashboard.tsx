'use client';

import { ChatWorkspace } from '@/components/features/chat/chat-workspace';
import { HomeDiscover } from '@/components/features/home-discover';
import { AgendaPaymentsWorkspace } from '@/components/features/agenda-payments-workspace';
import { useRouteTab } from '@/hooks/use-route-tab';
import type { AppTab } from '@/hooks/use-ui-store';
import type { AppRole } from '@/lib/utils/auth-redirect';

export default function ClienteDashboard({
  role = 'cliente',
  initialTab = 'portfolio',
}: {
  role?: AppRole;
  initialTab?: AppTab;
}) {
  // Aba derivada da ROTA (pathname + query), idêntica no SSR e no 1º frame do
  // cliente. Sem estado pós-hidratação: a aba "Agenda"/"Chat" já nasce correta
  // no HTML do servidor, eliminando o swap de layout no cold boot.
  const activeTab = useRouteTab(initialTab);

  return (
    <div className="relative flex min-w-0 w-full flex-1 flex-col bg-transparent pt-5 text-gray-900 transition-opacity duration-300 ease-in-out dark:text-white">
      <div className="relative flex min-w-0 w-full flex-1 flex-col gap-6">
        {activeTab === 'agendar' && (
          <section key="agendar" className="flex min-w-0 w-full flex-1 flex-col">
            <AgendaPaymentsWorkspace role={role} />
          </section>
        )}

        {activeTab === 'chat' && (
          <section
            key="chat"
            className="-mx-4 min-h-0 flex-1 transform-gpu transition-opacity duration-200 sm:-mx-6"
          >
            <ChatWorkspace />
          </section>
        )}

        {activeTab === 'portfolio' && (
          <section key="portfolio" className="min-w-0 w-full flex-1">
            <HomeDiscover />
          </section>
        )}
      </div>
    </div>
  );
}
