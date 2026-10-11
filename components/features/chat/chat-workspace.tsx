'use client';

import { memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, FileText, MessageCircle, ReceiptText } from 'lucide-react';
import { ConversationLifecycleBadge } from '@/components/chat/conversation-lifecycle-badge';
import { AtomicBookingSheet } from '@/components/features/atomic-booking-sheet';
import { ChatCategoryTabs } from '@/components/features/chat/chat-category-tabs';
import { ChatThread } from '@/components/features/chat/chat-thread';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchBar } from '@/components/ui/search-bar';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useAuthStore } from '@/hooks/use-auth-store';
import { useI18n } from '@/hooks/use-i18n';
import { useUiStore } from '@/hooks/use-ui-store';
import { portfolioLabelResolver } from '@/lib/portfolio-metadata';
import { dashboardPathForRole } from '@/lib/utils/auth-redirect';
import { forceViewportRecalibration, resetViewportScale } from '@/lib/utils/viewport-scale';
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
  const role = useAuthStore((s) => s.role);
  const isProfessional = role === 'tatuador' || role === 'estudio';
  const { styleLabel, bodyPartLabel } = portfolioLabelResolver(t);
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

  const handleBackToDashboard = useCallback(() => {
    triggerHaptic('light');
    // Hard clean-up ao sair do chat imersivo: purga foco/transform/escala
    // residual do viewport (mesmo fluxo das rotas "sem casco") para que a
    // dock do painel de destino monte perfeitamente alinhada no iOS.
    resetViewportScale({ forceBlur: true });
    forceViewportRecalibration();
    router.push(dashboardPathForRole(role));
  }, [role, router, triggerHaptic]);

  // Global discovery anchored at the inbox top: selecting a @username opens
  // that professional's vitrine instantly, mirroring Instagram Explore.
  const handleSearchSelect = useCallback(
    (user: { id: string }) => {
      triggerHaptic('light');
      router.push(`/dashboard/artista/${encodeURIComponent(user.id)}`);
    },
    [router, triggerHaptic]
  );

  return (
    <div className="relative flex h-[100dvh] max-h-[100dvh] min-h-0 min-w-0 w-full flex-col overflow-hidden bg-background text-neutral-900 transform-gpu transition-opacity duration-200 dark:text-white">
      <Suspense fallback={null}>
        <ChatQuerySync onChange={handleQueryChange} />
      </Suspense>

      {/* Inbox chrome — glass header + segmented control. */}
      <div className={cn('shrink-0', mobileThreadOpen ? 'hidden lg:block' : 'block')}>
        <header className="sticky top-0 z-50 shrink-0 border-b border-white/[0.06] bg-black/60 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md">
          <div className="flex min-h-11 items-center gap-2 px-3 pb-3">
            <button
              type="button"
              onClick={handleBackToDashboard}
              className="-ml-1 flex h-11 w-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-transform active:scale-95 dark:text-zinc-400"
              aria-label={t('common.back')}
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={1.9} />
            </button>
            {/* Search bar replaces the redundant "Chat & Orçamentos" title,
                anchored at the absolute top with an Instagram-Explore glass. */}
            <SearchBar onSelect={handleSearchSelect} className="min-w-0 flex-1" />
          </div>
        </header>

        <div className="relative px-3 pb-3 pt-3">
          <ChatCategoryTabs
            value={activeCategory}
            onChange={handleCategoryChange}
            counts={categoryCounts}
          />
        </div>
      </div>

      {/* Conversation area — single pane on mobile, split view on desktop. */}
      <div className="relative grid min-h-0 min-w-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-4 lg:p-3">
        <aside
          className={cn(
            'flex min-h-0 min-w-0 flex-col overflow-hidden',
            'lg:rounded-2xl lg:border lg:border-black/[0.04] lg:bg-white lg:shadow-sm dark:lg:border-white/[0.05] dark:lg:bg-white/[0.03]',
            mobileThreadOpen ? 'hidden lg:flex' : 'flex'
          )}
        >
          <div className="flex items-center gap-2 border-b border-black/[0.04] px-4 py-3 dark:border-white/[0.05]">
            {activeCategory === 'BUDGET' ? (
              <ReceiptText className="h-4 w-4 text-orange-500 dark:text-orange-400" />
            ) : (
              <MessageCircle className="h-4 w-4 text-orange-500 dark:text-orange-400" />
            )}
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">
              {activeCategoryLabel}
            </p>
          </div>
          <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 [-webkit-overflow-scrolling:touch]">
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
                'flex min-h-full flex-col transform-gpu transition-opacity duration-200',
                loadingList && orderedConversations.length === 0 ? 'opacity-0' : 'opacity-100'
              )}
            >
            {!loadingList && orderedConversations.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-8 py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-black/[0.05] bg-white/70 text-orange-500/70 opacity-70 shadow-[0_1px_2px_rgba(0,0,0,0.03)] dark:border-white/[0.06] dark:bg-white/[0.03] dark:text-orange-400/70">
                  {activeCategory === 'BUDGET' ? (
                    <FileText className="h-6 w-6" strokeWidth={1.6} aria-hidden />
                  ) : (
                    <MessageCircle className="h-6 w-6" strokeWidth={1.6} aria-hidden />
                  )}
                </div>
                <p className="mt-4 max-w-[22rem] text-balance text-[15px] font-semibold tracking-tight text-neutral-700 dark:text-zinc-200">
                  {activeCategory === 'BUDGET'
                    ? t(isProfessional ? 'chat.emptyQuotesProfessional' : 'chat.emptyQuotes')
                    : t('chat.empty')}
                </p>
                <p className="mt-1.5 max-w-[22rem] text-pretty text-[13px] leading-relaxed text-neutral-400 dark:text-zinc-500">
                  {activeCategory === 'BUDGET'
                    ? t(isProfessional ? 'chat.emptyQuotesProfessionalHint' : 'chat.emptyQuotesHint')
                    : t(isProfessional ? 'chat.emptyProfessionalHint' : 'chat.emptyHint')}
                </p>
              </div>
            ) : null}
            {orderedConversations.map((item) => {
              const active = selectedId === item.peer.id;
              // Structured booking request (Lead) vs. casual chat — surfaced
              // regardless of the active tab so the professional never misses
              // an orçamento hidden inside the Conversas list.
              const isQuoteItem =
                activeCategory === 'BUDGET' || item.categoria === 'ORCAMENTO';
              return (
                <div
                  key={item.peer.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => selectConversation(item.peer)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      selectConversation(item.peer);
                    }
                  }}
                  className={cn(
                    'mb-1 flex min-h-11 w-full cursor-pointer touch-manipulation items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60',
                    // Hover affordance is gated to hover-capable pointers so it can
                    // never hijack the first tap on touch devices (double-tap bug).
                    '[@media(hover:hover)]:hover:border-black/[0.04] [@media(hover:hover)]:hover:bg-neutral-50 dark:[@media(hover:hover)]:hover:border-white/[0.05] dark:[@media(hover:hover)]:hover:bg-white/5',
                    active
                      ? 'border-orange-500/50 bg-orange-500/10 shadow-[0_0_18px_rgba(249,115,22,0.18)]'
                      : 'border-transparent'
                  )}
                >
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      triggerHaptic('light');
                      router.push(`/dashboard/artista/${encodeURIComponent(item.peer.id)}`);
                    }}
                    className="flex h-10 w-10 min-h-10 min-w-10 shrink-0 items-center justify-center rounded-full border border-orange-500/30 bg-white text-sm font-semibold text-orange-500 dark:bg-white/[0.05] dark:text-orange-400"
                    aria-label={t('chat.openVitrine', { name: item.peer.name })}
                  >
                    {item.peer.initial}
                  </button>
                  <div className="min-w-0 flex-1 text-left">
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate text-sm font-semibold text-neutral-900 dark:text-white">{item.peer.name}</span>
                        {isQuoteItem ? (
                          <span
                            className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-500 dark:text-orange-300"
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
                    <span className="mt-0.5 block truncate text-[11px] text-neutral-500 dark:text-zinc-500">
                      {item.lastMessage?.mensagem ||
                        (activeCategory === 'BUDGET' ? t('chat.newQuoteRequest') : t('chat.newConversation'))}
                    </span>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        </aside>

        <section
          className={cn(
            'min-h-0 min-w-0 overflow-hidden',
            'lg:rounded-2xl',
            mobileThreadOpen ? 'flex' : 'hidden lg:flex'
          )}
        >
          <ChatThread
            actorId={actorId}
            destinatarioId={selectedPeer?.id}
            peerName={selectedPeer?.name}
            peerRole={selectedPeer?.role}
            artworkId={artworkId}
            artwork={artwork}
            bookingIntent={bookingIntent}
            onBack={() => setMobileThreadOpen(false)}
            onOpenProfile={(artistId) => {
              triggerHaptic('light');
              router.push(`/dashboard/artista/${encodeURIComponent(artistId)}`);
            }}
            onOpenBooking={(artistId, nextArtworkId) => {
              void openBooking(artistId, nextArtworkId);
            }}
          />
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
