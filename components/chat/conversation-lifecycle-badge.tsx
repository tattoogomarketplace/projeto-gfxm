'use client';

import { memo } from 'react';
import { CalendarClock, HeartPulse } from 'lucide-react';
import type { ChatLifecycleStatus } from '@/lib/types/chat';
import { useI18n } from '@/hooks/use-i18n';
import { cn } from '@/lib/utils';

type ConversationLifecycleBadgeProps = {
  status: ChatLifecycleStatus | null;
  className?: string;
};

export const ConversationLifecycleBadge = memo(function ConversationLifecycleBadge({
  status,
  className,
}: ConversationLifecycleBadgeProps) {
  const { t } = useI18n();
  if (!status) return null;

  const scheduled = status.kind === 'scheduled';
  const Icon = scheduled ? CalendarClock : HeartPulse;
  const label = scheduled
    ? t('lifecycle.scheduled')
    : t('lifecycle.healing', { day: status.healingDay ?? 1 });

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium leading-none',
        scheduled
          ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300'
          : 'border-slate-400/30 bg-slate-500/10 text-slate-600 dark:border-zinc-400/20 dark:bg-zinc-400/10 dark:text-zinc-300',
        className
      )}
      aria-label={label}
    >
      <Icon className="h-3 w-3 shrink-0" strokeWidth={1.75} aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  );
});
