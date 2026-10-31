'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CalendarDays, ChevronRight, Send, ShieldAlert } from 'lucide-react';
import { toast } from '@/lib/toast';
import { InstagramSpinnerOverlay } from '@/components/ui/instagram-spinner';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { useChatHistory } from '@/hooks/use-chat-history';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useOfflineQueue } from '@/hooks/use-offline-queue';
import { useI18n } from '@/hooks/use-i18n';
import { queryKeys } from '@/lib/query/keys';
import { bearerHeaders } from '@/lib/query/auth-headers';
import type { ChatArtworkRef, ChatMessageDto } from '@/lib/types/chat';
import type { MessageKey, TranslateVars } from '@/lib/i18n/types';
import { validateChatMessage } from '@/lib/utils/chat-moderation';
import { portfolioLabelResolver } from '@/lib/portfolio-metadata';
import { cn } from '@/lib/utils';
import { formatAppError } from '@/lib/error-handler';

type ThreadMessage = {
  id: string;
  sender: 'user' | 'peer';
  text: string;
  createdAt: string;
  blocked?: boolean;
};

type ChatThreadProps = {
  actorId: string | null;
  destinatarioId?: string;
  peerName?: string;
  peerRole?: string;
  artworkId?: string;
  artwork?: ChatArtworkRef | null;
  bookingIntent?: boolean;
  onBack?: () => void;
  onOpenProfile?: (artistId: string) => void;
  onOpenBooking?: (artistId: string, artworkId?: string) => void;
};

type Translate = (key: MessageKey, vars?: TranslateVars) => string;

function bookingDraft(t: Translate, artwork?: ChatArtworkRef | null): string {
  const { styleLabel, bodyPartLabel } = portfolioLabelResolver(t);
  if (artwork) {
    const body = artwork.bodyPart
      ? t('chat.bookingDraftBody', { part: bodyPartLabel(artwork.bodyPart) })
      : '';
    return t('chat.bookingDraftStyled', { style: styleLabel(artwork.style), body });
  }
  return t('chat.bookingDraft');
}

export function ChatThread({
  actorId,
  destinatarioId,
  peerName,
  peerRole,
  artworkId,
  artwork,
  bookingIntent = false,
  onBack,
  onOpenProfile,
  onOpenBooking,
}: ChatThreadProps) {
  const { t } = useI18n();
  const peerFallback = peerRole === 'cliente' ? t('chat.clientFallback') : t('chat.artistFallback');
  const { styleLabel, bodyPartLabel, healingLabel } = portfolioLabelResolver(t);
  const [input, setInput] = useState(() => (bookingIntent ? bookingDraft(t, artwork) : ''));
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { triggerHaptic } = useHapticFeedback();
  const enqueue = useOfflineQueue((s) => s.enqueue);
  const historyQuery = useChatHistory(destinatarioId);
  const loading = historyQuery.isLoading;
  const historyKey = queryKeys.chatHistorico(destinatarioId ?? '');

  const mapRows = useCallback(
    (rows: ChatMessageDto[]): ThreadMessage[] =>
      rows
        .filter((row) => !row.bloqueada)
        .map((row) => ({
          id: row.id,
          sender: actorId && row.remetente_id === actorId ? 'user' : 'peer',
          text: row.mensagem,
          createdAt: row.created_at,
        })),
    [actorId]
  );

  const messages = useMemo(
    () => mapRows(historyQuery.data ?? []),
    [historyQuery.data, mapRows]
  );

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !destinatarioId || sending) return;

    const { isValid } = validateChatMessage(text);
    if (!isValid) {
      toast.error(t('toast.chatBlocked'));
      return;
    }

    const payload: Record<string, unknown> = {
      destinatario_id: destinatarioId,
      mensagem: text,
      ...(artworkId && messages.length === 0 ? { artworkId } : {}),
    };
    const optimistic: ThreadMessage = {
      id: `local-${Date.now()}`,
      sender: 'user',
      text,
      createdAt: new Date().toISOString(),
    };
    queryClient.setQueryData<ChatMessageDto[]>(historyKey, (prev) => [
      ...(prev ?? []),
      {
        id: optimistic.id,
        remetente_id: actorId ?? '',
        destinatario_id: destinatarioId,
        mensagem: text,
        bloqueada: false,
        status: 'enviado',
        categoria: 'DIRECT',
        created_at: optimistic.createdAt,
      },
    ]);
    setInput('');
    triggerHaptic('light');

    const online = typeof navigator === 'undefined' ? true : navigator.onLine;
    if (!online) {
      enqueue('message', payload);
      return;
    }

    setSending(true);
    try {
      const headers = await bearerHeaders(getToken, { 'Content-Type': 'application/json' });
      const res = await fetch('/api/chat/enviar', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as {
        sucesso?: boolean;
        erro?: string;
        mensagem?: ChatMessageDto;
      };
      if (!res.ok || !json.sucesso) {
        queryClient.setQueryData<ChatMessageDto[]>(historyKey, (prev) =>
          (prev ?? []).filter((item) => item.id !== optimistic.id)
        );
        toast.error(json.erro ? formatAppError({ message: json.erro }, 'api') : t('toast.chatSendFailed'));
        return;
      }
      if (json.mensagem) {
        queryClient.setQueryData<ChatMessageDto[]>(historyKey, (prev) => [
          ...(prev ?? []).filter((item) => item.id !== optimistic.id),
          json.mensagem!,
        ]);
      }
    } catch {
      enqueue('message', payload);
    } finally {
      setSending(false);
    }
  };

  if (!destinatarioId) {
    return (
      <div className="flex h-full min-h-0 w-full flex-1 flex-col bg-background text-neutral-900 dark:text-white lg:rounded-2xl lg:border lg:border-black/[0.04] lg:bg-white lg:shadow-sm dark:lg:border-white/[0.05] dark:lg:bg-white/[0.03]">
        {onBack ? (
          <header className="glass-chrome safe-header-pad shrink-0 border-b border-black/[0.04] dark:border-white/[0.06] lg:hidden">
            <div className="flex min-h-11 items-center gap-2 pb-3 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
              <button
                type="button"
                onClick={onBack}
                className="-ml-1 flex h-11 w-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-transform active:scale-95 dark:text-zinc-400"
                aria-label={t('common.back')}
              >
                <ArrowLeft className="h-5 w-5" strokeWidth={1.9} />
              </button>
            </div>
          </header>
        ) : null}
        <div className="flex flex-1 flex-col items-center justify-center py-10 pl-[max(1.5rem,env(safe-area-inset-left))] pr-[max(1.5rem,env(safe-area-inset-right))] text-center">
          <p className="max-w-full text-sm font-medium text-neutral-900 dark:text-white">{t('chat.selectArtist')}</p>
          <p className="mt-1 max-w-xs text-balance text-xs text-neutral-500 dark:text-zinc-500">
            {t('chat.selectArtistHint')}
          </p>
        </div>
      </div>
    );
  }

  const openProfile = () => {
    if (!destinatarioId || !onOpenProfile) return;
    onOpenProfile(destinatarioId);
  };

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-background text-neutral-900 dark:text-white lg:rounded-2xl lg:border lg:border-black/[0.04] lg:bg-white lg:shadow-sm dark:lg:border-white/[0.05] dark:lg:bg-white/[0.03]">
      {/* Header — sticky, glassmorphism, safe-area aware. */}
      <header className="glass-chrome safe-header-pad sticky top-0 z-30 shrink-0 border-b border-black/[0.04] dark:border-white/[0.06]">
        <div className="flex items-center gap-2 pb-3 pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] sm:pl-[max(0.75rem,env(safe-area-inset-left))] sm:pr-[max(0.75rem,env(safe-area-inset-right))]">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="-ml-1 flex h-11 w-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-transform active:scale-95 dark:text-zinc-400 lg:hidden"
              aria-label={t('common.back')}
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={1.9} />
            </button>
          ) : null}
          <button
            type="button"
            onClick={openProfile}
            disabled={!destinatarioId || !onOpenProfile}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default"
            aria-label={t('chat.openVitrine', { name: peerName || peerFallback })}
          >
            <span className="flex h-10 w-10 min-h-10 min-w-10 shrink-0 items-center justify-center rounded-full border border-orange-500/40 bg-white text-sm font-semibold text-orange-500 dark:bg-white/[0.06] dark:text-orange-400">
              {(peerName || 'A').charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-neutral-900 dark:text-white">{peerName || peerFallback}</span>
              <span className="block truncate text-[11px] text-neutral-500 dark:text-zinc-400">
                {bookingIntent ? t('chat.requestBooking') : t('chat.sessionQuestions')}
              </span>
            </span>
            {onOpenProfile ? (
              <ChevronRight className="h-5 w-5 shrink-0 text-neutral-400 dark:text-zinc-500" strokeWidth={1.75} />
            ) : null}
          </button>
          {destinatarioId && onOpenBooking ? (
            <button
              type="button"
              onClick={() => onOpenBooking(destinatarioId, artworkId)}
              className="flex h-11 min-h-11 shrink-0 items-center gap-1 rounded-xl border border-orange-500/40 px-3 text-xs font-semibold text-orange-600 dark:text-orange-300"
              aria-label={t('chat.bookWith', { name: peerName || peerFallback })}
            >
              <CalendarDays className="h-4 w-4" strokeWidth={1.75} />
              {t('chat.book')}
            </button>
          ) : null}
        </div>
      </header>

      {artwork ? (
        <div className="flex shrink-0 gap-3 border-b border-black/[0.04] bg-neutral-50 py-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] dark:border-white/[0.05] dark:bg-white/[0.04]">
          <div className="relative h-14 w-14 min-h-14 min-w-14 overflow-hidden rounded-xl border border-orange-500/30">
            <OptimizedImage src={artwork.imageUrl} alt={styleLabel(artwork.style)} className="h-full w-full" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-500 dark:text-orange-400">
              {t('chat.projectReference')}
            </p>
            <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">{styleLabel(artwork.style)}</p>
            <p className="truncate text-[11px] text-neutral-500 dark:text-zinc-500">
              {artwork.bodyPart ? `${bodyPartLabel(artwork.bodyPart)} · ` : ''}
              {healingLabel(artwork.isHealed)}
            </p>
          </div>
          {destinatarioId && onOpenBooking ? (
            <button
              type="button"
              onClick={() => onOpenBooking(destinatarioId, artwork.id)}
              className="flex min-h-11 shrink-0 items-center gap-1 rounded-xl border border-orange-500/40 px-3 text-xs font-semibold text-orange-600 dark:text-orange-300"
            >
              {t('chat.book')}
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Message thread — the single scrolling surface; flex-1 fills the gap. */}
      <div
        ref={scrollRef}
        className="relative min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain py-4 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] [-webkit-overflow-scrolling:touch]"
      >
        {loading && messages.length === 0 ? <InstagramSpinnerOverlay /> : null}
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn('flex', message.sender === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[82%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                message.sender === 'user'
                  ? 'rounded-br-md bg-gradient-to-b from-orange-500 to-orange-600 text-white shadow-[0_6px_18px_rgba(249,115,22,0.32)]'
                  : 'rounded-bl-md border border-black/[0.04] bg-white text-neutral-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/[0.06] dark:bg-white/[0.06] dark:text-zinc-100 dark:shadow-[0_2px_10px_rgba(0,0,0,0.35)]'
              )}
            >
              {message.text}
            </div>
          </div>
        ))}
        {!loading && messages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 px-4 py-6 text-center dark:border-white/[0.06]">
            <p className="text-sm text-neutral-500 dark:text-zinc-400">{t('chat.emptyMessages')}</p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-zinc-500">{t('chat.emptyMessagesHint')}</p>
          </div>
        ) : null}
      </div>

      {/* Composer — anchored to the base with safe-area padding. */}
      <div className="glass-chrome sticky bottom-0 z-30 shrink-0 border-t border-black/[0.04] pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom),env(keyboard-inset-bottom,0px))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] dark:border-white/[0.06]">
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500 dark:text-zinc-500">
          <ShieldAlert className="h-3 w-3 text-orange-500 dark:text-orange-400" />
          {t('chat.paymentsBlocked')}
        </p>
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onFocus={() => {
              if (bookingIntent && !input.trim()) {
                setInput(bookingDraft(t, artwork));
              }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void sendMessage();
              }
            }}
            rows={1}
            className="max-h-28 min-h-11 flex-1 resize-none rounded-xl border border-black/[0.04] bg-white px-3 py-2.5 text-base leading-5 text-neutral-900 caret-neutral-900 outline-none placeholder:text-neutral-400 focus:border-orange-500/50 dark:border-white/[0.06] dark:bg-white/[0.05] dark:text-white dark:caret-white dark:placeholder:text-zinc-500"
            placeholder={
              bookingIntent
                ? bookingDraft(t, artwork)
                : artwork
                  ? t('chat.placeholderQuote')
                  : t('chat.placeholderMessage')
            }
          />
          <button
            type="button"
            onClick={() => void sendMessage()}
            disabled={sending || !input.trim()}
            className="flex h-11 w-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-orange-500/40 bg-orange-500/15 text-orange-600 transition-all hover:bg-orange-500/25 active:scale-95 disabled:opacity-40 dark:text-orange-400"
            aria-label={t('chat.sendAria')}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
