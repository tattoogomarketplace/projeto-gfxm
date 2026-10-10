'use client';

import { useMemo } from 'react';
import { Activity, CalendarCheck, CalendarClock, Sparkles } from 'lucide-react';
import { GlassContainer } from '@/components/ui/glass-container';
import { Skeleton } from '@/components/ui/skeleton';
import { useAgendamentos } from '@/hooks/use-agendamentos';
import { useI18n } from '@/hooks/use-i18n';
import { MOCK_STUDIO_ACTIVE_SESSIONS } from '@/lib/mocks/studio-active-sessions';
import {
  formatBRL,
  formatWhen,
  groupStudioRoster,
  resolveTone,
} from '@/lib/utils/agenda-status';
import { cn } from '@/lib/utils';
import type { Agendamento } from '@/lib/types/database';

const MAX_FEED_ITEMS = 4;

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: number;
}) {
  return (
    <GlassContainer className="flex items-center gap-3 p-3.5">
      <span className="flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-500 dark:text-orange-400">
        <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xl font-bold leading-none tabular-nums text-gray-900 dark:text-white">
          {value}
        </p>
        <p className="mt-1 truncate text-[11px] font-medium text-neutral-500 dark:text-zinc-500">
          {label}
        </p>
      </div>
    </GlassContainer>
  );
}

function FeedRow({ agendamento }: { agendamento: Agendamento }) {
  const { t } = useI18n();
  const tone = resolveTone(agendamento.status);
  const StatusIcon = tone.icon;

  return (
    <li className="flex items-center gap-3 rounded-2xl border border-black/[0.04] bg-white/[0.03] p-3 backdrop-blur-xl dark:border-white/[0.05]">
      <span
        className={cn(
          'flex h-9 w-9 min-h-9 min-w-9 shrink-0 items-center justify-center rounded-xl border',
          tone.pill
        )}
      >
        <StatusIcon className="h-4 w-4" strokeWidth={2} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold tracking-tight text-gray-900 dark:text-white">
          {formatWhen(agendamento.data_hora)}
        </p>
        <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-zinc-500">
          {t(tone.labelKey)}
        </p>
      </div>
      <span className="shrink-0 text-xs font-semibold tabular-nums text-neutral-600 dark:text-zinc-300">
        {formatBRL(agendamento.valor_total)}
      </span>
    </li>
  );
}

export function HubActivityFeed() {
  const { t } = useI18n();
  const { data, isLoading } = useAgendamentos();

  const feed = useMemo<Agendamento[]>(() => {
    const roster = groupStudioRoster(data);
    const combined = [...roster.today, ...roster.upcoming];
    if (combined.length > 0) return combined;
    return MOCK_STUDIO_ACTIVE_SESSIONS.map((session) => session.agendamento);
  }, [data]);

  const { todayCount, upcomingCount } = useMemo(() => {
    const roster = groupStudioRoster(data);
    return {
      todayCount: roster.today.length,
      upcomingCount: roster.upcoming.length,
    };
  }, [data]);

  const visible = feed.slice(0, MAX_FEED_ITEMS);
  const next = feed[0] ?? null;

  return (
    <section className="min-w-0 w-full" aria-label={t('hub.activity')}>
      <div className="mb-3 flex items-center gap-2 px-1">
        <Activity className="h-3.5 w-3.5 text-orange-500 dark:text-orange-400" strokeWidth={2} />
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-500 dark:text-orange-400">
          {t('hub.activity')}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3" aria-hidden>
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-[4.5rem] w-full rounded-2xl" />
            <Skeleton className="h-[4.5rem] w-full rounded-2xl" />
          </div>
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <StatTile icon={CalendarCheck} label={t('hub.visitsToday')} value={todayCount} />
            <StatTile icon={CalendarClock} label={t('agenda.upcoming')} value={upcomingCount} />
          </div>

          <GlassContainer className="relative overflow-hidden p-4">
            <span
              aria-hidden
              className="pointer-events-none absolute -right-12 -top-14 h-32 w-32 rounded-full bg-orange-500/15 blur-3xl"
            />
            <div className="relative flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-orange-500 dark:text-orange-400">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              {t('hub.nextAppointment')}
            </div>
            {next ? (
              <div className="relative mt-2 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-bold tracking-tight text-gray-900 dark:text-white">
                    {formatWhen(next.data_hora)}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-zinc-500">
                    {t(resolveTone(next.status).labelKey)}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-neutral-700 dark:text-zinc-200">
                  {formatBRL(next.valor_total)}
                </span>
              </div>
            ) : (
              <p className="relative mt-2 text-sm text-neutral-500 dark:text-zinc-400">
                {t('hub.noUpcoming')}
              </p>
            )}
          </GlassContainer>

          {visible.length > 0 ? (
            <ul className="space-y-2.5">
              {visible.map((agendamento, index) => (
                <FeedRow
                  key={agendamento.id ?? `hub-feed-${index}`}
                  agendamento={agendamento}
                />
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </section>
  );
}
