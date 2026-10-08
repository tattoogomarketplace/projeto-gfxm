'use client';

import { memo } from 'react';
import { MessageCircle, ReceiptText } from 'lucide-react';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import type { ChatTab } from '@/lib/types/chat';
import type { MessageKey } from '@/lib/i18n/types';
import { cn } from '@/lib/utils';

const TABS: { value: ChatTab; labelKey: MessageKey; ariaKey: MessageKey }[] = [
  { value: 'DIRECT', labelKey: 'chat.conversations', ariaKey: 'chat.directAria' },
  { value: 'BUDGET', labelKey: 'chat.quotes', ariaKey: 'chat.quotesAria' },
];

type ChatCategoryTabsProps = {
  value: ChatTab;
  onChange: (value: ChatTab) => void;
  counts?: Partial<Record<ChatTab, number>>;
  className?: string;
};

function ChatCategoryTabsBase({ value, onChange, counts, className }: ChatCategoryTabsProps) {
  const { triggerHaptic } = useHapticFeedback();
  const { t } = useI18n();
  const activeIndex = Math.max(0, TABS.findIndex((tab) => tab.value === value));

  return (
    <div
      role="tablist"
      aria-label={t('chat.filterAria')}
      className={cn(
        'relative grid w-full rounded-2xl border border-black/[0.04] bg-neutral-100 p-1 backdrop-blur-xl',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:border-white/[0.05] dark:bg-white/10',
        className
      )}
      style={{ gridTemplateColumns: `repeat(${TABS.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute top-1 bottom-1 rounded-xl border border-orange-500/30 bg-gradient-to-b from-orange-500/30 to-orange-500/10 shadow-[0_0_18px_rgba(249,115,22,0.35),inset_0_1px_0_rgba(255,255,255,0.1)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform"
        style={{
          width: `calc((100% - 0.5rem) / ${TABS.length})`,
          transform: `translateX(calc(${activeIndex} * 100%))`,
          left: '0.25rem',
        }}
      />
      {TABS.map((tab) => {
        const selected = tab.value === value;
        const count = counts?.[tab.value] ?? 0;
        const Icon = tab.value === 'BUDGET' ? ReceiptText : MessageCircle;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-label={t(tab.ariaKey)}
            onClick={() => {
              if (selected) return;
              triggerHaptic('light');
              onChange(tab.value);
            }}
            className={cn(
              'relative z-10 flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl px-3',
              'text-[13px] font-semibold tracking-tight transition-colors duration-200',
              'active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/70',
              selected
                ? 'text-orange-700 drop-shadow-[0_0_10px_rgba(249,115,22,0.45)] dark:text-orange-200'
                : 'text-neutral-500 hover:text-neutral-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={selected ? 2.25 : 1.9} />
            <span>{t(tab.labelKey)}</span>
            {count > 0 ? (
              <span
                className={cn(
                  'flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums',
                  selected
                    ? 'bg-orange-500 text-black'
                    : 'bg-neutral-300 text-neutral-700 dark:bg-white/15 dark:text-zinc-200'
                )}
              >
                {count > 99 ? '99+' : count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export const ChatCategoryTabs = memo(ChatCategoryTabsBase);
