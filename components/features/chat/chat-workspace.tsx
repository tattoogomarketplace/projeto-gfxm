'use client';

import { memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, MessageCircle, ReceiptText, Sparkles } from 'lucide-react';
import { FlashNotesCarousel } from '@/components/chat/flash-notes-carousel';
import { ConversationLifecycleBadge } from '@/components/chat/conversation-lifecycle-badge';
import { AtomicBookingSheet } from '@/components/features/atomic-booking-sheet';
import { ChatCategoryTabs } from '@/components/features/chat/chat-category-tabs';
import { ChatThread } from '@/components/features/chat/chat-thread';
import { Skeleton } from '@/components/ui/skeleton';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { useUiStore } from '@/hooks/use-ui-store';
import { bodyPartLabel, styleLabel } from '@/lib/portfolio-metadata';
import type { ChatArtworkRef, ChatConversationDto, ChatPeer, ChatTab } from '@/lib/types/chat';
import { cn } from '@/lib/utils';

type ContextPayload = {
  sucesso?: boolean;
  actorId?: string;
  peer?: ChatPeer;
  artwork?: ChatArtworkRef | null;
};

async function authHeaders(getToken: () => Promise<string | null>): Promise<HeadersInit> {
  const clerkToken = await getToken().catch(() => null);
  const stored = typeof window !== 'undefined' ? localStorage.getItem('tattoogo_token') : null;
  const token = clerkToken || stored;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type ChatQuery = {
  artistId: string | null;
  artworkId: string | null;
  bookingIntent: boolean;
};

const EMPTY_QUERY: ChatQuery = { artistId: null, artworkId: null, bookingIntent: false };

type CategoryConversations = Record<ChatTab, ChatConversationDto[]>;

const EMPTY_CATEGORY_DATA: CategoryConversations = { DIRECT: [], BUDGET: [] };

let conversationCache: {
  actorId: string | null;
  byCategory: CategoryConversations;
} | null = null;
const categoryInflight: Partial<Record<ChatTab, Promise<void>>> = {};

function ChatQuerySync({ onChange }: { onChange: (next: ChatQuery) => void }) {
  const searchParams = useSearchParams();
  const artistId = searchParams.get('artistId') || searchParams.get('tatuadorId');
  const artworkId = searchParams.get('artworkId') || searchParams.get('portfolioId');
  const bookingIntent = searchParams.get('intent') === 'agendar';

  useEffect(() => {
    onChange({ artistId, artworkId, bookingIntent });
  }, [artistId, artworkId, bookingIntent, onChange]);

  return null;
}

export const ChatWorkspace = memo(function ChatWorkspace() {
  const router = useRouter();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const { triggerHaptic } = useHapticFeedback();
  const { t } = useI18n();
  const pendingChatPeer = useUiStore((s) => s.pendingChatPeer);
  const pendingChatArtwork = useUiStore((s) => s.pendingChatArtwork);
  const setPendingChatPeer = useUiStore((s) => s.setPendingChatPeer);
  const setPendingChatArtwork = useUiStore((s) => s.setPendingChatArtwork);
  const setActiveTab = useUiStore((s) => s.setActiveTab);

  const [query, setQuery] = useState<ChatQuery>(EMPTY_QUERY);
  const handleQueryChange = useCallback((next: ChatQuery) => {
    setQuery((current) =>
      current.artistId === next.artistId &&
      current.artworkId === next.artworkId &&
      current.bookingIntent === next.bookingIntent
        ? current
        : next
    );
  }, []);

  const artistIdParam = query.artistId;
  const artworkIdParam = query.artworkId;
  const bookingIntent = query.bookingIntent;

  const [actorId, setActorId] = useState<string | null>(() => conversationCache?.actorId ?? null);
  const [activeCategory, setActiveCategory] = useState<ChatTab>('DIRECT');
  const [conversationsByCategory, setConversationsByCategory] = useState<CategoryConversations>(
    () => conversationCache?.byCategory ?? EMPTY_CATEGORY_DATA
  );
  const [loadedCategories, setLoadedCategories] = useState<Record<ChatTab, boolean>>(() =>
    conversationCache ? { DIRECT: true, BUDGET: true } : { DIRECT: false, BUDGET: false }
  );

  const conversations = conversationsByCategory[activeCategory];
  const loadingList = !loadedCategories[activeCategory];
  const [selectedPeer, setSelectedPeer] = useState<ChatPeer | null>(null);
  const [artwork, setArtwork] = useState<ChatArtworkRef | null>(null);
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingSlots, setBookingSlots] = useState<string[]>([]);
  const bookingIntentOpened = useRef(false);

  const selectedId = selectedPeer?.id ?? artistIdParam ?? pendingChatPeer;
  const artworkId = artwork?.id ?? artworkIdParam ?? pendingChatArtwork ?? undefined;

  const loadCategory = useCallback(async (category: ChatTab) => {
    const inflight = categoryInflight[category];
    if (inflight) {
      await inflight;
    } else {
      const request = (async () => {
        try {
          const headers = await authHeaders(getTokenRef.current);
          const res = await fetch(`/api/chat/conversas?categoria=${category}`, {
            headers,
            cache: 'no-store',
          });
          if (!res.ok) return;
          const json = (await res.json().catch(() => ({}))) as {
            actorId?: string;
            conversas?: ChatConversationDto[];
          };
          const previous = conversationCache?.byCategory ?? EMPTY_CATEGORY_DATA;
          conversationCache = {
            actorId: json.actorId ?? conversationCache?.actorId ?? null,
            byCategory: { ...previous, [category]: json.conversas ?? [] },
          };
        } catch {
          return;
        }
      })();
      categoryInflight[category] = request;
      try {
        await request;
      } finally {
        if (categoryInflight[category] === request) delete categoryInflight[category];
      }
    }

    if (conversationCache) {
      setActorId(conversationCache.actorId);
      setConversationsByCategory(conversationCache.byCategory);
    }
    setLoadedCategories((current) =>
      current[category] ? current : { ...current, [category]: true }
    );
  }, []);

  const loadContext = useCallback(async (artistId: string, nextArtworkId?: string | null) => {
    try {
      const headers = await authHeaders(getTokenRef.current);
      const params = new URLSearchParams({ artistId });
      if (nextArtworkId) params.set('artworkId', nextArtworkId);
      const res = await fetch(`/api/chat/contexto?${params.toString()}`, {
        headers,
        cache: 'no-store',
      });
      if (!res.ok) return;
      const json = (await res.json().catch(() => ({}))) as ContextPayload;
      if (json.actorId) setActorId(json.actorId);
      if (json.peer) setSelectedPeer(json.peer);
      setArtwork(json.artwork ?? null);
      setMobileThreadOpen(true);
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    if (useUiStore.getState().activeTab !== 'chat') setActiveTab('chat');
  }, [setActiveTab]);

  useEffect(() => {
    const run = async () => {
      await Promise.all([loadCategory('DIRECT'), loadCategory('BUDGET')]);
    };
    void run();
  }, [loadCategory]);

  useEffect(() => {
    const targetArtist = artistIdParam || pendingChatPeer;
    const targetArtwork = artworkIdParam || pendingChatArtwork;
    if (!targetArtist) return;
    const run = async () => {
      await loadContext(targetArtist, targetArtwork);
      setPendingChatPeer(null);
      setPendingChatArtwork(null);
    };
    void run();
  }, [
    artistIdParam,
    artworkIdParam,
    pendingChatPeer,
    pendingChatArtwork,
    loadContext,
    setPendingChatPeer,
    setPendingChatArtwork,
  ]);

  const orderedConversations = useMemo(() => {
    if (!selectedPeer) return conversations;
    const exists = conversations.some((item) => item.peer.id === selectedPeer.id);
    if (exists) {
      return [
        ...conversations.filter((item) => item.peer.id === selectedPeer.id),
        ...conversations.filter((item) => item.peer.id !== selectedPeer.id),
      ];
    }
    return [
      { peer: selectedPeer, lastMessage: null, unreadCount: 0, categoria: 'ORCAMENTO', lifecycle: null },
      ...conversations,
    ];
  }, [conversations, selectedPeer]);

  const selectConversation = (peer: ChatPeer) => {
    triggerHaptic('light');
    setSelectedPeer(peer);
    setArtwork(null);
    setMobileThreadOpen(true);
    router.replace(`/dashboard/chat?artistId=${encodeURIComponent(peer.id)}`, { scroll: false });
  };

  const handleCategoryChange = useCallback(
    (category: ChatTab) => {
      setActiveCategory(category);
      void loadCategory(category);
    },
    [loadCategory]
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<ChatTab, number> = { DIRECT: 0, BUDGET: 0 };
    (Object.keys(conversationsByCategory) as ChatTab[]).forEach((key) => {
      counts[key] = conversationsByCategory[key].reduce(
        (total, item) => total + (item.unreadCount || 0),
        0
      );
    });
    return counts;
  }, [conversationsByCategory]);

  const activeCategoryLabel = activeCategory === 'BUDGET' ? t('chat.quotes') : t('chat.conversations');

  const openBooking = useCallback(
    async (artistId: string, nextArtworkId?: string) => {
      triggerHaptic('medium');
      try {
        const res = await fetch(`/api/artistas/${encodeURIComponent(artistId)}`, { cache: 'no-store' });
        const json = (await res.json().catch(() => ({}))) as { availableSlots?: string[] };
        setBookingSlots(Array.isArray(json.availableSlots) ? json.availableSlots : []);
      } catch {
        setBookingSlots([]);
      }
      if (nextArtworkId && artwork?.id !== nextArtworkId) {
        await loadContext(artistId, nextArtworkId);
      }
      setBookingOpen(true);
    },
    [artwork?.id, loadContext, triggerHaptic]
  );

  useEffect(() => {
    if (!bookingIntent || !selectedPeer?.id || bookingIntentOpened.current) return;
    bookingIntentOpened.current = true;
    void openBooking(selectedPeer.id, artworkId);
  }, [artworkId, bookingIntent, openBooking, selectedPeer?.id]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-x-hidden pt-3 text-neutral-900 transform-gpu transition-opacity duration-200 dark:text-white">
      <Suspense fallback={null}>
        <ChatQuerySync onChange={handleQueryChange} />
      </Suspense>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(120%_100%_at_50%_0%,rgba(249,115,22,0.16),transparent_65%)]"
      />

      <div className={cn('shrink-0', mobileThreadOpen ? 'hidden lg:block' : 'block')}>
        <div className="relative mb-3 px-1 lg:mb-4">
          <FlashNotesCarousel />
        </div>
        <div className="relative mb-3 px-1 lg:mb-4">
          <ChatCategoryTabs
            value={activeCategory}
            onChange={handleCategoryChange}
            counts={categoryCounts}
          />
        </div>
      </div>

      <div className="relative grid min-h-[32rem] flex-1 gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <aside
          className={cn(
            'flex min-h-0 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-[#121212] dark:shadow-none',
            mobileThreadOpen ? 'hidden lg:flex' : 'flex'
          )}
        >
          <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
            {activeCategory === 'BUDGET' ? (
              <ReceiptText className="h-4 w-4 text-orange-500 dark:text-orange-400" />
            ) : (
              <MessageCircle className="h-4 w-4 text-orange-500 dark:text-orange-400" />
            )}
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">
              {activeCategoryLabel}
            </p>
          </div>
          <div className="relative min-h-0 flex-1 overflow-y-auto p-2">
            <div
              className={cn(
                'pointer-events-none absolute inset-x-0 top-0 space-y-2 p-2 transform-gpu transition-opacity duration-200',
                loadingList && orderedConversations.length === 0 ? 'opacity-100' : 'opacity-0'
              )}
              aria-hidden={!loadingList || orderedConversations.length > 0}
            >
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
            <div
              className={cn(
                'transform-gpu transition-opacity duration-200',
                loadingList && orderedConversations.length === 0 ? 'opacity-0' : 'opacity-100'
              )}
            >
            {!loadingList && orderedConversations.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <Sparkles className="mx-auto h-5 w-5 text-orange-500 dark:text-orange-400" />
                <p className="mt-3 text-sm text-neutral-500 dark:text-zinc-400">
                  {activeCategory === 'BUDGET' ? t('chat.emptyQuotes') : t('chat.empty')}
                </p>
                <p className="mt-1 text-xs text-neutral-500 dark:text-zinc-500">
                  {activeCategory === 'BUDGET' ? t('chat.emptyQuotesHint') : t('chat.emptyHint')}
                </p>
              </div>
            ) : null}
            {orderedConversations.map((item) => {
              const active = selectedId === item.peer.id;
              return (
                <div
                  key={item.peer.id}
                  className={cn(
                    'mb-1 flex min-h-11 w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-all',
                    active
                      ? 'border-orange-500/50 bg-orange-500/10 shadow-[0_0_18px_rgba(249,115,22,0.18)]'
                      : 'border-transparent hover:border-neutral-200 hover:bg-neutral-50 dark:hover:border-neutral-800 dark:hover:bg-white/5'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      router.push(`/dashboard/artista/${encodeURIComponent(item.peer.id)}`);
                    }}
                    className="flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-full border border-orange-500/30 bg-white text-sm font-semibold text-orange-500 dark:bg-[#1a1a1a] dark:text-orange-400"
                    aria-label={t('chat.openVitrine', { name: item.peer.name })}
                  >
                    {item.peer.initial}
                  </button>
                  <button
                    type="button"
                    onClick={() => selectConversation(item.peer)}
                    className="min-w-0 flex-1 text-left active:scale-[0.99]"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-neutral-900 dark:text-white">{item.peer.name}</span>
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
                    <span className="mt-0.5 block truncate text-[11px] text-neutral-500 dark:text-zinc-500">
                      {item.lastMessage?.mensagem ||
                        (activeCategory === 'BUDGET' ? t('chat.newQuoteRequest') : t('chat.newConversation'))}
                    </span>
                  </button>
                </div>
              );
            })}
            </div>
          </div>
        </aside>

        <section className={cn('min-h-0', mobileThreadOpen ? 'flex' : 'hidden lg:flex')}>
          <div className="flex min-h-0 w-full flex-col">
            {selectedPeer ? (
              <button
                type="button"
                onClick={() => setMobileThreadOpen(false)}
                className="mb-3 flex min-h-11 items-center gap-2 text-sm text-neutral-500 dark:text-zinc-400 lg:hidden"
              >
                <ArrowLeft className="h-4 w-4" />
                {t('chat.conversations')}
              </button>
            ) : null}
            <ChatThread
              actorId={actorId}
              destinatarioId={selectedPeer?.id}
              peerName={selectedPeer?.name}
              artworkId={artworkId}
              artwork={artwork}
              bookingIntent={bookingIntent}
              onOpenProfile={(artistId) => {
                triggerHaptic('light');
                router.push(`/dashboard/artista/${encodeURIComponent(artistId)}`);
              }}
              onOpenBooking={(artistId, nextArtworkId) => {
                void openBooking(artistId, nextArtworkId);
              }}
            />
          </div>
        </section>
      </div>

      {selectedPeer ? (
        <AtomicBookingSheet
          artistId={selectedPeer.id}
          artistName={selectedPeer.name}
          slots={bookingSlots}
          artworkId={artwork?.id}
          artworkLabel={
            artwork
              ? `${styleLabel(artwork.style)}${artwork.bodyPart ? ` · ${bodyPartLabel(artwork.bodyPart)}` : ''}`
              : undefined
          }
          open={bookingOpen}
          onClose={() => setBookingOpen(false)}
          onBooked={() => {
            setActiveTab('agendar');
            router.push('/dashboard/cliente?tab=agendar');
          }}
        />
      ) : null}
    </div>
  );
});
