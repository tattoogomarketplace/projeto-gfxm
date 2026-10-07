'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { CalendarDays, ChevronRight, Send, ShieldAlert } from 'lucide-react';
import { toast } from '@/lib/toast';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { Skeleton } from '@/components/ui/skeleton';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useOfflineQueue } from '@/hooks/use-offline-queue';
import type { ChatArtworkRef, ChatMessageDto } from '@/lib/types/chat';
import { validateChatMessage } from '@/lib/utils/chat-moderation';
import { bodyPartLabel, healingLabel, styleLabel } from '@/lib/portfolio-metadata';
import { cn } from '@/lib/utils';

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
  artworkId?: string;
  artwork?: ChatArtworkRef | null;
  bookingIntent?: boolean;
  onOpenProfile?: (artistId: string) => void;
  onOpenBooking?: (artistId: string, artworkId?: string) => void;
};

function bookingDraft(artwork?: ChatArtworkRef | null): string {
  if (artwork) {
    return `Gostaria de agendar uma sessão de ${styleLabel(artwork.style)}${
      artwork.bodyPart ? ` em ${bodyPartLabel(artwork.bodyPart)}` : ''
    }. Podemos confirmar um horário disponível?`;
  }
  return 'Gostaria de agendar uma sessão. Podemos confirmar um horário disponível?';
}

async function authHeaders(getToken: () => Promise<string | null>): Promise<HeadersInit> {
  const clerkToken = await getToken().catch(() => null);
  const stored = typeof window !== 'undefined' ? localStorage.getItem('tattoogo_token') : null;
  const token = clerkToken || stored;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function ChatThread({
  actorId,
  destinatarioId,
  peerName,
  artworkId,
  artwork,
  bookingIntent = false,
  onOpenProfile,
  onOpenBooking,
}: ChatThreadProps) {
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [input, setInput] = useState(() => (bookingIntent ? bookingDraft(artwork) : ''));
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { getToken } = useAuth();
  const { triggerHaptic } = useHapticFeedback();
  const enqueue = useOfflineQueue((s) => s.enqueue);

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

  const loadHistory = useCallback(async () => {
    if (!destinatarioId) {
      setMessages([]);
      return;
    }
    try {
      const headers = await authHeaders(getToken);
      const res = await fetch(
        `/api/chat/historico?interlocutor_id=${encodeURIComponent(destinatarioId)}`,
        { headers, cache: 'no-store' }
      );
      if (!res.ok) return;
      const json = (await res.json().catch(() => ({}))) as { data?: ChatMessageDto[] };
      setMessages(mapRows(json.data ?? []));
    } catch {
      return;
    }
  }, [destinatarioId, getToken, mapRows]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!cancelled) setLoading(Boolean(destinatarioId));
      await loadHistory();
      if (!cancelled) setLoading(false);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [loadHistory, destinatarioId]);

  useEffect(() => {
    if (!destinatarioId) return;
    const timer = window.setInterval(() => {
      void loadHistory();
    }, 4000);
    return () => window.clearInterval(timer);
  }, [destinatarioId, loadHistory]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !destinatarioId || sending) return;

    const { isValid, error } = validateChatMessage(text);
    if (!isValid) {
      toast.error(error || 'Mensagem bloqueada pelas diretrizes.');
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
    setMessages((prev) => [...prev, optimistic]);
    setInput('');
    triggerHaptic('light');

    const online = typeof navigator === 'undefined' ? true : navigator.onLine;
    if (!online) {
      enqueue('message', payload);
      return;
    }

    setSending(true);
    try {
      const headers = await authHeaders(getToken);
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
        setMessages((prev) => prev.filter((item) => item.id !== optimistic.id));
        toast.error(json.erro || 'Não foi possível enviar a mensagem.');
        return;
      }
      if (json.mensagem) {
        const confirmed = mapRows([json.mensagem]);
        setMessages((prev) => [
          ...prev.filter((item) => item.id !== optimistic.id),
          ...confirmed,
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
      <div className="flex min-h-[22rem] flex-1 flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-white px-6 text-center shadow-sm dark:border-neutral-800 dark:bg-[#121212] dark:shadow-none">
        <p className="text-sm font-medium text-neutral-900 dark:text-white">Selecione um artista</p>
        <p className="mt-1 max-w-xs text-xs text-neutral-500 dark:text-zinc-500">
          Escolha uma conversa ou inicie um orçamento a partir da galeria de inspirações.
        </p>
      </div>
    );
  }

  const openProfile = () => {
    if (!destinatarioId || !onOpenProfile) return;
    onOpenProfile(destinatarioId);
  };

  return (
    <div className="flex h-[28rem] min-h-[28rem] flex-1 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-[#121212] dark:shadow-[0_0_32px_rgba(0,0,0,0.35)] lg:h-auto">
      <div className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <button
          type="button"
          onClick={openProfile}
          disabled={!destinatarioId || !onOpenProfile}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default"
          aria-label={`Abrir vitrine de ${peerName || 'artista'}`}
        >
          <span className="flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-full border border-orange-500/40 bg-white text-sm font-semibold text-orange-500 dark:bg-[#1a1a1a] dark:text-orange-400">
            {(peerName || 'A').charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-neutral-900 dark:text-white">{peerName || 'Artista'}</span>
            <span className="block truncate text-[11px] text-neutral-500 dark:text-zinc-500">
              {bookingIntent ? 'Solicitar agendamento da sessão' : 'Orçamento e dúvidas da sessão'}
            </span>
          </span>
          {onOpenProfile ? (
            <ChevronRight className="h-5 w-5 shrink-0 text-neutral-400 dark:text-zinc-400" strokeWidth={1.75} />
          ) : null}
        </button>
        {destinatarioId && onOpenBooking ? (
          <button
            type="button"
            onClick={() => onOpenBooking(destinatarioId, artworkId)}
            className="flex h-11 min-h-11 shrink-0 items-center gap-1 rounded-xl border border-orange-500/40 px-3 text-xs font-semibold text-orange-600 dark:text-orange-300"
            aria-label={`Agendar com ${peerName || 'artista'}`}
          >
            <CalendarDays className="h-4 w-4" strokeWidth={1.75} />
            Agendar
          </button>
        ) : null}
      </div>

      {artwork ? (
        <div className="flex gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-[#161616]">
          <div className="relative h-14 w-14 min-h-14 min-w-14 overflow-hidden rounded-xl border border-orange-500/30">
            <OptimizedImage src={artwork.imageUrl} alt={styleLabel(artwork.style)} className="h-full w-full" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-500 dark:text-orange-400">
              Referência de projeto
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
              Agendar
            </button>
          ) : null}
        </div>
      ) : null}

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {loading && messages.length === 0 ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-2/3 rounded-2xl" />
            <Skeleton className="ml-auto h-12 w-1/2 rounded-2xl" />
            <Skeleton className="h-12 w-3/5 rounded-2xl" />
          </div>
        ) : null}
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn('flex', message.sender === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[82%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                message.sender === 'user'
                  ? 'rounded-br-md bg-orange-500 text-white shadow-[0_0_18px_rgba(249,115,22,0.28)]'
                  : 'rounded-bl-md border border-neutral-200 bg-neutral-50 text-neutral-800 dark:border-neutral-800 dark:bg-[#1a1a1a] dark:text-zinc-200'
              )}
            >
              {message.text}
            </div>
          </div>
        ))}
        {!loading && messages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 px-4 py-6 text-center dark:border-neutral-800">
            <p className="text-sm text-neutral-500 dark:text-zinc-400">Nenhuma mensagem ainda.</p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-zinc-500">Descreva o projeto para solicitar um orçamento.</p>
          </div>
        ) : null}
      </div>

      <div className="border-t border-neutral-200 bg-white px-3 py-3 dark:border-neutral-800 dark:bg-[#121212]">
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500 dark:text-zinc-500">
          <ShieldAlert className="h-3 w-3 text-orange-500 dark:text-orange-400" />
          Pagamentos e links externos são bloqueados
        </p>
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onFocus={() => {
              if (bookingIntent && !input.trim()) {
                setInput(bookingDraft(artwork));
              }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void sendMessage();
              }
            }}
            rows={1}
            className="max-h-28 min-h-11 flex-1 resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-900 caret-neutral-900 outline-none placeholder:text-neutral-400 focus:border-orange-500/50 dark:border-neutral-800 dark:bg-[#161616] dark:text-white dark:caret-white dark:placeholder:text-zinc-500"
            placeholder={
              bookingIntent
                ? bookingDraft(artwork)
                : artwork
                  ? 'Peça um orçamento sobre esta arte...'
                  : 'Digite sua mensagem...'
            }
          />
          <button
            type="button"
            onClick={() => void sendMessage()}
            disabled={sending || !input.trim()}
            className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl border border-orange-500/40 bg-orange-500/15 text-orange-600 transition-all hover:bg-orange-500/25 active:scale-95 disabled:opacity-40 dark:text-orange-400"
            aria-label="Enviar mensagem"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
