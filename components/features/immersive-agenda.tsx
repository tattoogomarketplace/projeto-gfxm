'use client';

import { useMemo, useState } from 'react';
import { TimelineCard } from '@/components/features/agenda-timeline-card';
import { PaymentsPanel } from '@/components/features/payments-hub';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useI18n } from '@/hooks/use-i18n';
import type { UserSession } from '@/lib/types/user-session';
import type { AppRole } from '@/lib/utils/auth-redirect';

type AgendaPane = 'agenda' | 'payments';

export function ImmersiveAgenda({
  sessions,
  role,
}: {
  sessions: UserSession[];
  role: AppRole;
}) {
  const { t } = useI18n();
  const [view, setView] = useState<AgendaPane>('agenda');
  const activeSessions = useMemo(
    () => sessions.filter((session) => session.sessionStatus !== 'COMPLETED'),
    [sessions]
  );

  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-none bg-zinc-950 pb-[calc(env(safe-area-inset-bottom)+7rem)] text-white [-webkit-overflow-scrolling:touch]">
      <header className="sticky top-0 z-40 bg-zinc-950/85 pb-2 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="px-4 pt-3">
          <SegmentedControl
            options={[
              { value: 'agenda', label: t('agenda.tabClient') },
              { value: 'payments', label: t('payments.tabClient') },
            ]}
            value={view}
            onChange={setView}
            ariaLabel={t('agenda.tab')}
            className="border-zinc-800 bg-zinc-900/80 dark:border-zinc-800 dark:bg-zinc-900/80"
          />
        </div>
      </header>

      <div className={view === 'agenda' ? 'px-4 pt-5' : 'hidden'}>
        {activeSessions.length === 0 ? (
          <p className="px-2 py-16 text-center text-sm text-zinc-500">{t('agenda.empty')}</p>
        ) : (
          activeSessions.map((session) => <TimelineCard key={session.id} session={session} />)
        )}
      </div>

      <div className={view === 'payments' ? 'px-4 pt-5' : 'hidden'}>
        <PaymentsPanel role={role} />
      </div>
    </div>
  );
}
