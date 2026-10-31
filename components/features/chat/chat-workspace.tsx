'use client';

import {
  memo,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileText, MessageCircle } from 'lucide-react';
import { AtomicBookingSheet } from '@/components/features/atomic-booking-sheet';
import { ChatCategoryTabs } from '@/components/features/chat/chat-category-tabs';
import { ChatListCard } from '@/components/features/chat/chat-list-card';
import { ChatThread } from '@/components/features/chat/chat-thread';
import { InstagramSpinnerOverlay } from '@/components/ui/instagram-spinner';
import { ChatInboxSkeleton } from '@/components/ui/route-skeletons';
import { SearchBar } from '@/components/ui/search-bar';
import { TattooMachineMenuTrigger } from '@/components/ui/tattoo-machine-menu-icon';
import { useChatConversations } from '@/hooks/use-chat-conversations';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useAuthStore } from '@/hooks/use-auth-store';
import { useI18n } from '@/hooks/use-i18n';
import { useSettingsDrawerOpen, useUiStore } from '@/hooks/use-ui-store';
import { portfolioLabelResolver } from '@/lib/portfolio-metadata';
import { bearerHeaders } from '@/lib/query/auth-headers';
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

export type ChatWorkspaceProps = {
  actorId?: string | null;
  initialDirect?: ChatConversationDto[];
  initialBudget?: ChatConversationDto[];
};

export const ChatWorkspace = memo(function ChatWorkspace(props: ChatWorkspaceProps) {
  return (
    <Suspense fallback={<ChatInboxSkeleton />}>
      <ChatWorkspaceInner {...props} />
    </Suspense>
  );
});

const ChatWorkspaceInner = memo(function ChatWorkspaceInner({
  actorId: actorIdProp = null,
  initialDirect,
  initialBudget,
}: ChatWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const artistIdParam = searchParams.get('artistId') || searchParams.get('tatuadorId');
  const artworkIdParam = searchParams.get('artworkId') || searchParams.get('portfolioId');
  const bookingIntent = searchParams.get('intent') === 'agendar';
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const { triggerHaptic } = useHapticFeedback();
  const { t } = useI18n();
  const role = useAuthStore((s) => s.role);
  const { styleLabel, bodyPartLabel } = portfolioLabelResolver(t);
  const pendingChatPeer = useUiStore((s) => s.pendingChatPeer);
  const pendingChatArtwork = useUiStore((s) => s.pendingChatArtwork);
  const setPendingChatPeer = useUiStore((s) => s.setPendingChatPeer);
  const setPendingChatArtwork = useUiStore((s) => s.setPendingChatArtwork);
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const settingsDrawerOpen = useSettingsDrawerOpen();
  const toggleSettingsDrawer = useUiStore((s) => s.toggleSettingsDrawer);

  const directQuery = useChatConversations('DIRECT', initialDirect);
  const budgetQuery = useChatConversations('BUDGET', initialBudget);
  const conversationsByCategory = useMemo(
    () => ({
      DIRECT: directQuery.data?.conversas ?? initialDirect ?? [],
      BUDGET: budgetQuery.data?.conversas ?? initialBudget ?? [],
    }),
    [budgetQuery.data?.conversas, directQuery.data?.conversas, initialBudget, initialDirect]
  );
  const actorId =
    directQuery.data?.actorId ?? budgetQuery.data?.actorId ?? actorIdProp ?? null;

  const [activeCategory, setActiveCategory] = useState<ChatTab>('DIRECT');
  const [selectedPeer, setSelectedPeer] = useState<ChatPeer | null>(null);
  const [artwork, setArtwork] = useState<ChatArtworkRef | null>(null);
  const mobileThreadOpen = Boolean(artistIdParam);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingSlots, setBookingSlots] = useState<string[]>([]);
  const bookingIntentOpened = useRef(false);

  const selectedId = selectedPeer?.id ?? artistIdParam ?? pendingChatPeer;
  const artworkId = artwork?.id ?? artworkIdParam ?? pendingChatArtwork ?? undefined;

  const loadContext = useCallback(async (artistId: string, nextArtworkId?: string | null) => {
    try {
      const headers = await bearerHeaders(getTokenRef.current);
      const params = new URLSearchParams({ artistId });
      if (nextArtworkId) params.set('artworkId', nextArtworkId);
      const res = await fetch(`/api/chat/contexto?${params.toString()}`, {
        headers,
        cache: 'no-store',
      });
      if (!res.ok) return;
      const json = (await res.json().catch(() => ({}))) as ContextPayload;
      if (json.peer) setSelectedPeer(json.peer);
      setArtwork(json.artwork ?? null);
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

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

  const orderedFor = useCallback(
    (category: ChatTab) => {
      const conversations = conversationsByCategory[category];
      if (!selectedPeer) return conversations;
      const exists = conversations.some((item) => item.peer.id === selectedPeer.id);
      if (exists) {
        return [
          ...conversations.filter((item) => item.peer.id === selectedPeer.id),
          ...conversations.filter((item) => item.peer.id !== selectedPeer.id),
        ];
      }
      if (category !== 'BUDGET') return conversations;
      return [
        {
          peer: selectedPeer,
          lastMessage: null,
          unreadCount: 0,
          categoria: 'ORCAMENTO' as const,
          lifecycle: null,
        },
        ...conversations,
      ];
    },
    [conversationsByCategory, selectedPeer]
  );

  const selectConversation = (peer: ChatPeer) => {
    triggerHaptic('light');
    setSelectedPeer(peer);
    setArtwork(null);
    router.push(`/dashboard/chat?artistId=${encodeURIComponent(peer.id)}`, { scroll: false });
  };

  const closeThread = useCallback(() => {
    triggerHaptic('light');
    setSelectedPeer(null);
    setArtwork(null);
    router.replace('/dashboard/chat', { scroll: false });
  }, [router, triggerHaptic]);

  const handleCategoryChange = useCallback((category: ChatTab) => {
    setActiveCategory(category);
  }, []);

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

  const openPublicProfile = useCallback(
    (handle: string) => {
      triggerHaptic('light');
      resetViewportScale({ forceBlur: true });
      forceViewportRecalibration();
      router.push(`/dashboard/artistas/${encodeURIComponent(handle)}`);
    },
    [router, triggerHaptic]
  );

  const handleSearchSelect = useCallback(
    (user: { id: string; username?: string | null }) => {
      openPublicProfile(user.username || user.id);
    },
    [openPublicProfile]
  );

  const renderPane = (category: ChatTab) => {
    const items = orderedFor(category);
    const categoryLoading = category === 'DIRECT' ? directQuery.isLoading : budgetQuery.isLoading;
    const showSpinner = categoryLoading && items.length === 0;
    const empty = !categoryLoading && items.length === 0;
    const isBudget = category === 'BUDGET';

    return (
      <div className={activeCategory === category ? 'relative flex min-h-full flex-col' : 'hidden'}>
        {showSpinner ? <InstagramSpinnerOverlay /> : null}
        {empty ? (
          <div className="flex flex-col items-center justify-center mt-20 px-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-500/40 bg-orange-500/10 text-orange-400">
              {isBudget ? (
                <FileText className="h-6 w-6" strokeWidth={1.6} aria-hidden />
              ) : (
                <MessageCircle className="h-6 w-6" strokeWidth={1.6} aria-hidden />
              )}
            </div>
            <p className="mt-4 max-w-[22rem] text-balance text-[15px] font-semibold tracking-tight text-zinc-200">
              {isBudget ? t('chat.emptyQuotes') : t('chat.empty')}
            </p>
            <p className="mt-1.5 max-w-[22rem] text-pretty text-[13px] leading-relaxed text-zinc-500">
              {isBudget ? t('chat.emptyQuotesHint') : t('chat.emptyHint')}
            </p>
          </div>
        ) : null}
        {items.map((item) => (
          <ChatListCard
            key={`${category}-${item.peer.id}`}
            item={item}
            active={selectedId === item.peer.id}
            isQuote={isBudget || item.categoria === 'ORCAMENTO' || item.categoria === 'BUDGET'}
            previewFallback={isBudget ? t('chat.newQuoteRequest') : t('chat.newConversation')}
            onSelect={selectConversation}
            onOpenProfile={openPublicProfile}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="relative flex h-full max-h-full min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden bg-zinc-950 text-zinc-100 transform-gpu transition-opacity duration-200">
      <div className={cn('shrink-0', mobileThreadOpen ? 'hidden lg:block' : 'block')}>
        <header className="sticky top-0 z-40 shrink-0 border-b border-zinc-900 bg-zinc-950/90 pt-[max(env(safe-area-inset-top),_1.5rem)] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pb-2 backdrop-blur-xl">
          <div className="flex min-h-11 items-center gap-2">
            <SearchBar onSelect={handleSearchSelect} className="min-w-0 flex-1" />
            <TattooMachineMenuTrigger
              open={settingsDrawerOpen}
              onClick={toggleSettingsDrawer}
            />
          </div>
          <div className="pt-3">
            <ChatCategoryTabs
              value={activeCategory}
              onChange={handleCategoryChange}
              counts={categoryCounts}
            />
          </div>
        </header>
      </div>

      <div className="relative grid min-h-0 min-w-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-4 lg:p-3">
        <aside
          className={cn(
            'flex min-h-0 min-w-0 flex-col overflow-hidden',
            'lg:rounded-2xl lg:border lg:border-zinc-800 lg:bg-zinc-950',
            mobileThreadOpen ? 'hidden lg:flex' : 'flex'
          )}
        >
          <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain pt-2 pb-[var(--dock-clearance)] pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] [-webkit-overflow-scrolling:touch]">
            {renderPane('DIRECT')}
            {renderPane('BUDGET')}
          </div>
        </aside>

        <section
          className={cn(
            'flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
            'lg:rounded-2xl',
            mobileThreadOpen ? 'flex' : 'hidden lg:flex'
          )}
        >
          <ChatThread
            actorId={actorId}
            destinatarioId={selectedId ?? undefined}
            peerName={selectedPeer?.name}
            peerRole={selectedPeer?.role}
            artworkId={artworkId}
            artwork={artwork}
            bookingIntent={bookingIntent}
            onBack={closeThread}
            onOpenProfile={(artistId) => {
              openPublicProfile(artistId);
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
            router.push(`${dashboardPathForRole(role)}?tab=agendar`);
          }}
        />
      ) : null}
    </div>
  );
});
