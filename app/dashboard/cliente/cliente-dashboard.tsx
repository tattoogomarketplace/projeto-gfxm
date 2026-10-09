'use client';

import { ChatWorkspace } from '@/components/features/chat/chat-workspace';
import { HomeDiscover } from '@/components/features/home-discover';
import { AgendaPaymentsWorkspace } from '@/components/features/agenda-payments-workspace';
import { useUiStore } from '@/hooks/use-ui-store';
import type { AppRole } from '@/lib/utils/auth-redirect';

export default function ClienteDashboard({ role = 'cliente' }: { role?: AppRole }) {
  const activeTab = useUiStore((s) => s.activeTab);

  return (
    <div className="relative flex min-w-0 w-full flex-1 flex-col bg-transparent pt-5 text-gray-900 transition-opacity duration-300 ease-in-out dark:text-white">
      <div className="relative flex min-h-0 min-w-0 w-full flex-1 flex-col gap-6">
        {activeTab === 'agendar' && (
          <section key="agendar" className="flex min-h-0 min-w-0 w-full flex-1 flex-col">
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
