'use client';

import { type ReactNode } from 'react';
import { CalendarDays } from 'lucide-react';
import { useAgendamentos } from '@/hooks/use-agendamentos';
import { ChatWorkspace } from '@/components/features/chat/chat-workspace';
import { HomeDiscover } from '@/components/features/home-discover';
import { AgendaTimeline } from '@/components/features/agenda-timeline';
import { useUiStore } from '@/hooks/use-ui-store';
import { useI18n } from '@/hooks/use-i18n';

function SectionHeading({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-500 shadow-[0_0_18px_rgba(249,115,22,0.22)] dark:text-orange-400">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
          {title}
        </h2>
        {subtitle ? <p className="mt-0.5 text-sm text-neutral-600 dark:text-zinc-400">{subtitle}</p> : null}
      </div>
    </div>
  );
}

export default function ClienteDashboard() {
  const { data: agendamentos, isLoading } = useAgendamentos();
  const { t } = useI18n();

  const activeTab = useUiStore((s) => s.activeTab);

  return (
    <div className="relative flex flex-col overflow-x-hidden bg-transparent pt-5 text-gray-900 transition-opacity duration-300 ease-in-out dark:text-white">
      <div className="relative space-y-6">
        {activeTab === 'agendar' && (
          <section key="agendar" className="space-y-5">
            <SectionHeading
              icon={<CalendarDays className="h-5 w-5" strokeWidth={1.75} />}
              title={t('agenda.timeline')}
              subtitle={t('agenda.timelineSubtitle')}
            />
            <AgendaTimeline agendamentos={agendamentos} isLoading={isLoading} />
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
          <section key="portfolio">
            <HomeDiscover />
          </section>
        )}
      </div>
    </div>
  );
}
