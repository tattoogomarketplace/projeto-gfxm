'use client';

import { Eye, Heart, Images, MousePointerClick } from 'lucide-react';
import { GlassContainer } from '@/components/ui/glass-container';
import { useI18n } from '@/hooks/use-i18n';
import { cn } from '@/lib/utils';

export type CreatorStudioMetrics = {
  views: number;
  profileClicks: number;
  likes: number;
  works: number;
};

function StatTile({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Eye;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <GlassContainer
      className={cn(
        'relative overflow-hidden p-3.5',
        accent && 'border-orange-500/25 shadow-[0_0_22px_rgba(249,115,22,0.12)]'
      )}
    >
      {accent ? (
        <span
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-orange-500/20 blur-2xl"
        />
      ) : null}
      <span
        className={cn(
          'relative flex h-9 w-9 min-h-9 min-w-9 items-center justify-center rounded-xl border',
          accent
            ? 'border-orange-500/40 bg-orange-500/15 text-orange-500 dark:text-orange-400'
            : 'border-black/[0.04] bg-white/[0.04] text-zinc-400 dark:border-white/[0.05]'
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={1.85} aria-hidden />
      </span>
      <p className="relative mt-3 text-xl font-bold leading-none tabular-nums tracking-tight text-gray-900 dark:text-white">
        {value.toLocaleString()}
      </p>
      <p className="relative mt-1.5 line-clamp-2 text-[11px] font-medium leading-snug text-neutral-500 dark:text-zinc-500">
        {label}
      </p>
    </GlassContainer>
  );
}

export function CreatorStudioStats({ metrics }: { metrics: CreatorStudioMetrics }) {
  const { t } = useI18n();

  return (
    <section className="min-w-0 w-full" aria-label={t('creator.dashboardTitle')}>
      <div className="mb-3 px-0.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-500 dark:text-orange-400">
          {t('creator.dashboardTitle')}
        </p>
        <p className="mt-1 text-xs text-neutral-500 dark:text-zinc-500">
          {t('creator.dashboardSubtitle')}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <StatTile icon={Eye} label={t('creator.statViews')} value={metrics.views} accent />
        <StatTile
          icon={MousePointerClick}
          label={t('creator.statProfileClicks')}
          value={metrics.profileClicks}
        />
        <StatTile icon={Heart} label={t('creator.statLikes')} value={metrics.likes} />
        <StatTile icon={Images} label={t('creator.statWorks')} value={metrics.works} />
      </div>
    </section>
  );
}
