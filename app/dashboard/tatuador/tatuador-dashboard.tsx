'use client';

import { Images } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { useUiStore } from '@/hooks/use-ui-store';
import { Skeleton } from '@/components/ui/skeleton';
import { ChatWorkspace } from '@/components/features/chat/chat-workspace';
import { PortfolioUpload } from '@/components/features/portfolio-upload';
import { AgendaPaymentsWorkspace } from '@/components/features/agenda-payments-workspace';
import { useI18n } from '@/hooks/use-i18n';
import type { AppRole } from '@/lib/utils/auth-redirect';

export default function TatuadorDashboard({ role = 'tatuador' }: { role?: AppRole }) {
  const { user } = useUser();
  const { t } = useI18n();
  const activeTab = useUiStore((s) => s.activeTab);

  return (
    <div className="flex w-full flex-1 flex-col bg-transparent pt-5 text-gray-900 transition-opacity duration-300 ease-in-out dark:text-white">
      {activeTab === 'portfolio' ? (
        <section key="portfolio" className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-500 dark:text-orange-400">
              <Images className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div>
              <h1 className="text-2xl font-bold">{t('dashboard.portfolio')}</h1>
              <p className="mt-1 text-sm text-neutral-600 dark:text-zinc-400">{t('dashboard.portfolioSubtitle')}</p>
            </div>
          </div>
          {user?.id ? (
            <PortfolioUpload tatuadorId={user.id} />
          ) : (
            <div className="space-y-4">
              <Skeleton className="h-40 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          )}
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
