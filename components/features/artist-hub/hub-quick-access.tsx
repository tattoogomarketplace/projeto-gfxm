'use client';

import { memo } from 'react';
import { ArrowUpRight, Images, Lock, Rocket, Star, Wallet } from 'lucide-react';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

type HubIcon = typeof Images;

interface HubCardProps {
  icon: HubIcon;
  title: string;
  subtitle: string;
  onClick: () => void;
  accent?: boolean;
  locked?: boolean;
  lockedLabel?: string;
  className?: string;
}

function HubCard({
  icon: Icon,
  title,
  subtitle,
  onClick,
  accent = false,
  locked = false,
  lockedLabel,
  className,
}: HubCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={title}
      className={cn(
        'group relative flex min-h-[7.5rem] transform-gpu flex-col justify-between overflow-hidden rounded-2xl border p-4 text-left backdrop-blur-xl',
        'transition-[transform,border-color,box-shadow] duration-200 ease-out active:scale-[0.97]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/70',
        accent
          ? 'border-orange-500/30 bg-gradient-to-br from-orange-500/[0.14] to-white/[0.02] shadow-[0_0_22px_rgba(249,115,22,0.14)] dark:from-orange-500/[0.16] dark:to-white/[0.03]'
          : 'border-black/[0.04] bg-white/[0.03] dark:border-white/[0.05]',
        className
      )}
    >
      {accent ? (
        <span
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-orange-500/20 blur-3xl"
        />
      ) : null}

      <div className="relative flex items-center justify-between">
        <span
          className={cn(
            'flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl border',
            accent
              ? 'border-orange-500/40 bg-orange-500/15 text-orange-500 dark:text-orange-400'
              : 'border-black/[0.04] bg-white/[0.04] text-zinc-400 dark:border-white/[0.05]'
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </span>
        {locked ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-black/[0.04] bg-black/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400 backdrop-blur dark:border-white/[0.05]">
            <Lock className="h-3 w-3" strokeWidth={2.25} aria-hidden />
            {lockedLabel}
          </span>
        ) : (
          <ArrowUpRight
            className="h-4 w-4 text-zinc-500 transition-transform duration-200 group-active:translate-x-0.5 group-active:-translate-y-0.5"
            strokeWidth={2}
            aria-hidden
          />
        )}
      </div>

      <div className="relative mt-3">
        <p className="truncate text-sm font-semibold tracking-tight text-gray-900 dark:text-white">
          {title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-neutral-500 dark:text-zinc-500">
          {subtitle}
        </p>
      </div>
    </button>
  );
}

export const HubQuickAccess = memo(function HubQuickAccess({
  onOpenPortfolio,
  onOpenEarnings,
}: {
  onOpenPortfolio: () => void;
  onOpenEarnings: () => void;
}) {
  const { t } = useI18n();
  const { triggerHaptic } = useHapticFeedback();

  const handle = (action: () => void) => () => {
    triggerHaptic('light');
    action();
  };

  const comingSoon = () => {
    triggerHaptic('medium');
    toast.info(t('hub.comingSoon'));
  };

  return (
    <section className="min-w-0 w-full" aria-label={t('hub.quickAccess')}>
      <div className="mb-3 flex items-center gap-2 px-1">
        <span className="h-1.5 w-1.5 rounded-full bg-orange-500" aria-hidden />
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-500 dark:text-orange-400">
          {t('hub.quickAccess')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <HubCard
          className="col-span-2"
          icon={Images}
          title={t('hub.portfolio')}
          subtitle={t('hub.portfolioSubtitle')}
          onClick={handle(onOpenPortfolio)}
          accent
        />
        <HubCard
          icon={Star}
          title={t('hub.reviews')}
          subtitle={t('hub.reviewsSubtitle')}
          onClick={comingSoon}
          locked
          lockedLabel={t('hub.comingSoon')}
        />
        <HubCard
          icon={Rocket}
          title={t('hub.boost')}
          subtitle={t('hub.boostSubtitle')}
          onClick={comingSoon}
          locked
          lockedLabel={t('hub.comingSoon')}
        />
        <HubCard
          className="col-span-2"
          icon={Wallet}
          title={t('hub.earnings')}
          subtitle={t('hub.earningsSubtitle')}
          onClick={handle(onOpenEarnings)}
        />
      </div>
    </section>
  );
});
