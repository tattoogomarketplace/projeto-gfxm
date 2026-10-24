'use client';

import { ChatWorkspace } from '@/components/features/chat/chat-workspace';
import { HomeDiscover } from '@/components/features/home-discover';
import { HomeDiscoverSkeleton } from '@/components/ui/route-skeletons';
import { AgendaPaymentsWorkspace } from '@/components/features/agenda-payments-workspace';
import { useRouteTab } from '@/hooks/use-route-tab';
import type { AppTab } from '@/hooks/use-ui-store';
import type { InspirationItem } from '@/lib/gallery-mock';
import type { AppRole } from '@/lib/utils/auth-redirect';

export default function ClienteDashboard({
  role = 'cliente',
  initialTab = 'portfolio',
  savedItems = [],
}: {
  role?: AppRole;
  initialTab?: AppTab;
  savedItems?: InspirationItem[];
}) {
  // Aba derivada da ROTA (pathname + query), idêntica no SSR e no 1º frame do
  // cliente. Sem estado pós-hidratação: a aba "Agenda"/"Chat" já nasce correta
  // no HTML do servidor, eliminando o swap de layout no cold boot.
  const activeTab = useRouteTab(initialTab);

  return (
    <div className="relative flex min-w-0 w-full flex-1 flex-col bg-transparent pt-5 text-gray-900 transition-opacity duration-300 ease-in-out dark:text-white">
      <div className="relative flex min-w-0 w-full flex-1 flex-col gap-6">
        {/*
         * Ramificação EXAUSTIVA da aba "Início". O retorno nunca cai para um
         * nó vazio: a aba 'portfolio' pinta o Feed de Descoberta e qualquer
         * outro estado (a fase ambígua em que a query ainda não foi resolvida,
         * ou o estado residual 'perfil' antes do redirecionamento do casco)
         * resolve para o skeleton do `loading.tsx` desta rota. Assim o
         * contêiner jamais fica transparente sobre o canvas `bg-background`
         * (#0a0a0a), eliminando o apagão preto de 1 frame entre o `loading.tsx`
         * e a hidratação do feed.
         */}
        {activeTab === 'agendar' ? (
          <section key="agendar" className="flex min-w-0 w-full flex-1 flex-col">
            <AgendaPaymentsWorkspace role={role} />
          </section>
        ) : activeTab === 'chat' ? (
          <section
            key="chat"
            className="-mx-4 min-h-0 flex-1 transform-gpu transition-opacity duration-200 sm:-mx-6"
          >
            <ChatWorkspace />
          </section>
        ) : activeTab === 'portfolio' ? (
          <section key="portfolio" className="min-w-0 w-full flex-1">
            <HomeDiscover savedItems={savedItems} />
          </section>
        ) : (
          // Fase transitória: pinta EXATAMENTE o skeleton do `loading.tsx`
          // desta rota até a aba final estar 100% resolvida. O skeleton
          // espelha a geometria do feed, então a troca é imperceptível.
          <section
            key="portfolio-skeleton"
            className="min-w-0 w-full flex-1"
            aria-busy="true"
          >
            <HomeDiscoverSkeleton />
          </section>
        )}
      </div>
    </div>
  );
}
