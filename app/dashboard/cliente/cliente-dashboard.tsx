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
        <h2 className="bg-gradient-to-r from-neutral-900 via-orange-700 to-orange-500 bg-clip-text text-lg font-bold tracking-tight text-transparent dark:from-white dark:via-orange-100 dark:to-orange-400">
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
    <div className="relative flex flex-col overflow-x-hidden bg-transparent pt-5 text-neutral-900 transition-opacity duration-300 ease-in-out dark:text-white">
      {activeTab === 'portfolio' ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(120%_100%_at_50%_0%,rgba(249,115,22,0.18),transparent_65%)]"
        />
      ) : null}

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
