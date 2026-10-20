'use client';

import { memo } from 'react';
import { ReceiptText } from 'lucide-react';
import { ConversationLifecycleBadge } from '@/components/chat/conversation-lifecycle-badge';
import { useI18n } from '@/hooks/use-i18n';
import type { ChatConversationDto, ChatPeer } from '@/lib/types/chat';
import { cn } from '@/lib/utils';

type ChatListCardProps = {
  item: ChatConversationDto;
  active: boolean;
  isQuote: boolean;
  previewFallback: string;
  onSelect: (peer: ChatPeer) => void;
  onOpenProfile: (peerId: string) => void;
};

function ChatListCardBase({
  item,
  active,
  isQuote,
  previewFallback,
  onSelect,
  onOpenProfile,
}: ChatListCardProps) {
  const { t } = useI18n();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(item.peer)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(item.peer);
        }
      }}
      className={cn(
        'mb-1 flex min-h-11 w-full cursor-pointer touch-manipulation items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60',
        '[@media(hover:hover)]:hover:border-zinc-800 [@media(hover:hover)]:hover:bg-zinc-900/60',
        active
          ? 'border-orange-500/50 bg-orange-500/10 shadow-[0_0_18px_rgba(249,115,22,0.18)]'
          : 'border-transparent'
      )}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onOpenProfile(item.peer.id);
        }}
        className="flex h-10 w-10 min-h-10 min-w-10 shrink-0 items-center justify-center rounded-full border border-orange-500/30 bg-zinc-900 text-sm font-semibold text-orange-400"
        aria-label={t('chat.openVitrine', { name: item.peer.name })}
      >
        {item.peer.initial}
      </button>
      <div className="min-w-0 flex-1 text-left">
        <span className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-zinc-100">{item.peer.name}</span>
            {isQuote ? (
              <span
                className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-300"
                aria-label={t('chat.quotes')}
                title={t('chat.quotes')}
              >
                <ReceiptText className="h-2.5 w-2.5" strokeWidth={2.4} aria-hidden />
              </span>
            ) : null}
          </span>
          {item.unreadCount > 0 ? (
            <span className="rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-black">
              {item.unreadCount}
            </span>
          ) : null}
        </span>
        {item.lifecycle ? (
          <span className="mt-1 flex min-w-0">
            <ConversationLifecycleBadge status={item.lifecycle} />
          </span>
        ) : null}
        <span className="mt-0.5 block truncate text-[11px] text-zinc-500">
          {item.lastMessage?.mensagem || previewFallback}
        </span>
      </div>
    </div>
  );
}

export const ChatListCard = memo(ChatListCardBase);
