'use client';

import { useMemo, useState } from 'react';
import { TimelineCard } from '@/components/features/agenda-timeline-card';
import { PaymentsVault } from '@/components/features/payments-vault';
import { InstagramSpinnerOverlay } from '@/components/ui/instagram-spinner';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useI18n } from '@/hooks/use-i18n';
import { useUserSessions } from '@/hooks/use-user-sessions';
import type { UserSession } from '@/lib/types/user-session';

type AgendaPane = 'agenda' | 'payments';

export function ImmersiveAgenda({ sessions: initialSessions }: { sessions?: UserSession[] }) {
  const { t } = useI18n();
  const { data, isLoading } = useUserSessions(initialSessions);
  const [view, setView] = useState<AgendaPane>('agenda');
  const sessions = useMemo(
    () => data ?? initialSessions ?? [],
    [data, initialSessions]
  );
  const activeSessions = useMemo(
    () => sessions.filter((session) => session.sessionStatus !== 'COMPLETED'),
    [sessions]
  );
  const showSpinner = isLoading && sessions.length === 0;

  return (
    <div className="absolute inset-0 z-0 min-h-0 w-full overflow-x-hidden overflow-y-auto overscroll-none bg-zinc-950 pb-[var(--dock-clearance)] text-white [-webkit-overflow-scrolling:touch]">
      <div className="mx-auto w-full max-w-2xl">
        <header className="sticky top-0 z-40 bg-zinc-950/85 pb-2 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
          <div className="pt-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
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

        <div className="relative min-h-[24rem] w-full">
          {showSpinner ? <InstagramSpinnerOverlay /> : null}

          <div className={view === 'agenda' ? 'w-full pt-5 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]' : 'hidden'}>
            {!showSpinner && activeSessions.length === 0 ? (
              <p className="px-2 py-16 text-center text-sm text-zinc-500">{t('agenda.empty')}</p>
            ) : (
              activeSessions.map((session) => <TimelineCard key={session.id} session={session} />)
            )}
          </div>

          <div className={view === 'payments' ? 'w-full pt-5 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]' : 'hidden'}>
            <PaymentsVault sessions={sessions} />
          </div>
        </div>
      </div>
    </div>
  );
}
