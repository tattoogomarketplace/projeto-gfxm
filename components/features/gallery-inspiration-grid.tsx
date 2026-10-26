'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type ComponentPropsWithoutRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Bookmark, Eye, Heart, ReceiptText, Send } from 'lucide-react';
import {
  TransformComponent,
  TransformWrapper,
  type ReactZoomPanPinchRef,
} from 'react-zoom-pan-pinch';
import { BudgetEstimatorSheet } from '@/components/features/budget-estimator-sheet';
import {
  GalleryHapticPreview,
  galleryPreviewLayoutId,
  type GalleryPreviewItem,
} from '@/components/features/gallery-haptic-preview';
import { TattooLikeButton, TattooMachineLikeGlyph } from '@/components/ui/tattoo-like-button';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { SpotlightModal, type SpotlightClient } from '@/components/ui/spotlight-modal';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { useUiStore } from '@/hooks/use-ui-store';
import { useViewTracker } from '@/hooks/use-view-tracker';
import { CLICK_SUPPRESSION_MS, LONG_PRESS_MS, LONG_PRESS_MOVE_TOLERANCE } from '@/hooks/use-long-press-preview';
import { toggleSave } from '@/actions/saved-actions';
import { getPostViewers, type PostViewerUser } from '@/actions/view-actions';
import type { InspirationItem } from '@/lib/gallery-mock';
import { portfolioLabelResolver } from '@/lib/portfolio-metadata';
import { artistProfileHref } from '@/lib/artist-profile';
import { cn } from '@/lib/utils';

const ASPECTS = ['aspect-[9/16]', 'aspect-[9/16]', 'aspect-[9/16]', 'aspect-[9/16]', 'aspect-[9/16]'] as const;

const GRID_CLASS = 'grid grid-cols-3 gap-[1px]';
const GRID_TILE_CLASS = 'relative w-full aspect-[9/16] overflow-hidden bg-white/5';
const FEED_LIST_CLASS = 'flex flex-col gap-8 w-full max-w-lg mx-auto';

const HUD_CURATORSHIP_CLASS =
  'relative z-[1] p-4 rounded-2xl flex flex-col gap-4 overflow-visible border-t border-x border-b-0 border-white/10 shadow-2xl';

const HUD_CURATORSHIP_STYLE = {
  backgroundColor: 'rgba(18, 18, 20, 0.4)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  backgroundImage:
    'linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)',
  backgroundSize: '16px 16px',
} as const;

const FEED_ACTION_BTN_CLASS =
  'flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-1.5 text-zinc-300 transition-all hover:border-orange-500/50';

const FEED_ACTION_METRIC_CLASS =
  'text-xs font-semibold tracking-wide text-gray-300 whitespace-nowrap';

const FEED_TOP_ACTION_BTN_CLASS =
  'flex flex-1 flex-row items-center justify-center gap-1.5 py-2 hover:bg-white/5 transition-colors cursor-pointer';

const FEED_TOP_ACTION_DIVIDER_CLASS = 'border-r border-white/10';

const FEED_TOP_ACTION_METRIC_CLASS =
  'text-[11px] sm:text-xs font-medium tracking-tight whitespace-nowrap leading-none';

type FeedListUser = {
  id: string;
  username: string;
  avatarUrl: string | null;
};

const FEED_LIKES_PLACEHOLDERS: FeedListUser[] = [
  {
    id: 'like-marina',
    username: '@marina_costa',
    avatarUrl:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=240&q=80&auto=format&fit=crop',
  },
  {
    id: 'like-rafael',
    username: '@rafael_lima',
    avatarUrl:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&q=80&auto=format&fit=crop',
  },
  {
    id: 'like-bianca',
    username: '@bianca_souza',
    avatarUrl:
      'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=240&q=80&auto=format&fit=crop',
  },
  {
    id: 'like-diego',
    username: '@diego_martins',
    avatarUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&q=80&auto=format&fit=crop',
  },
  {
    id: 'like-camila',
    username: '@camila_rocha',
    avatarUrl:
      'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=240&q=80&auto=format&fit=crop',
  },
  {
    id: 'like-lucas',
    username: '@lucas_ferreira',
    avatarUrl:
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=240&q=80&auto=format&fit=crop',
  },
];

const clientMountedSubscribe = () => () => {};

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return num.toString();
};

function FeedListUserRow({
  user,
  onSelect,
}: {
  user: FeedListUser;
  onSelect: (client: SpotlightClient) => void;
}) {
  const initial = user.username.replace(/^@/, '').charAt(0).toUpperCase() || 'U';
  return (
    <button
      type="button"
      onClick={() => onSelect({ username: user.username, avatarUrl: user.avatarUrl })}
      className="flex min-h-11 w-full items-center gap-3 border-b border-white/5 py-3 text-left last:border-b-0 transition-colors hover:bg-white/[0.03] active:scale-[0.99]"
    >
      {user.avatarUrl ? (
        <OptimizedImage
          src={user.avatarUrl}
          alt={user.username}
          className="h-10 w-10 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold uppercase text-zinc-100 ring-1 ring-white/10">
          {initial}
        </span>
      )}
      <span className="truncate text-[14px] font-medium text-zinc-100">{user.username}</span>
    </button>
  );
}

function FeedEngagementSheet({
  open,
  onClose,
  titleId,
  title,
  children,
  modal = true,
}: {
  open: boolean;
  onClose: () => void;
  titleId: string;
  title: string;
  children: ReactNode;
  modal?: boolean;
}) {
  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      modal={modal}
      dismissible={modal}
    >
      <DrawerContent aria-labelledby={titleId}>
        <DrawerHeader>
          <DrawerTitle id={titleId}>{title}</DrawerTitle>
        </DrawerHeader>
        <DrawerBody>{children}</DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

function FeedLikesSheet({
  open,
  onClose,
  likeCount,
}: {
  open: boolean;
  onClose: () => void;
  likeCount: number;
}) {
  const [selectedClient, setSelectedClient] = useState<SpotlightClient | null>(null);

  return (
    <>
      <FeedEngagementSheet
        open={open}
        onClose={() => {
          setSelectedClient(null);
          onClose();
        }}
        titleId="likes-sheet-title"
        title={`${likeCount.toLocaleString('pt-BR')} Curtidas`}
        modal={!selectedClient}
      >
        {FEED_LIKES_PLACEHOLDERS.map((user) => (
          <FeedListUserRow key={user.id} user={user} onSelect={setSelectedClient} />
        ))}
      </FeedEngagementSheet>
      <SpotlightModal client={selectedClient} onClose={() => setSelectedClient(null)} />
    </>
  );
}

function AnonymousExplorersRow({ count }: { count: number }) {
  return (
    <div
      aria-hidden={false}
      className="relative mb-4 overflow-hidden rounded-2xl border border-orange-500/25 bg-[linear-gradient(135deg,rgba(249,115,22,0.12),rgba(18,18,20,0.72)_46%,rgba(12,12,16,0.88))] p-4 shadow-[0_0_28px_rgba(249,115,22,0.12)]"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-orange-500/20 blur-2xl animate-pulse"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_50%,rgba(249,115,22,0.18),transparent_42%)]"
      />
      <div className="relative flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-orange-500/35 bg-black/45 text-orange-400 shadow-[0_0_16px_rgba(249,115,22,0.28)]">
          <Eye className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold tracking-wide text-orange-200">
            Visitantes Anônimos
          </p>
          <p className="mt-0.5 text-[11px] tracking-wide text-zinc-400">
            Exploradores ocultos nesta obra
          </p>
        </div>
        <span className="shrink-0 font-mono text-[15px] font-semibold tabular-nums text-white">
          {count.toLocaleString('pt-BR')}
        </span>
      </div>
    </div>
  );
}

function FeedViewsSheet({
  open,
  onClose,
  postId,
  viewsCount,
}: {
  open: boolean;
  onClose: () => void;
  postId: string | null;
  viewsCount: number;
}) {
  const [snapshot, setSnapshot] = useState<{
    postId: string;
    anonymousCount: number;
    viewers: PostViewerUser[];
  } | null>(null);
  const [selectedClient, setSelectedClient] = useState<SpotlightClient | null>(null);

  useEffect(() => {
    if (!open || !postId) return;
    let cancelled = false;
    void getPostViewers(postId).then((result) => {
      if (cancelled) return;
      if (!result.success) {
        setSnapshot({
          postId,
          anonymousCount: Math.max(0, viewsCount),
          viewers: [],
        });
        return;
      }
      setSnapshot({
        postId,
        anonymousCount: result.anonymousCount,
        viewers: result.viewers,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [open, postId, viewsCount]);

  const loading = !snapshot || snapshot.postId !== postId;
  const anonymousCount = snapshot?.postId === postId ? snapshot.anonymousCount : 0;
  const viewers = snapshot?.postId === postId ? snapshot.viewers : [];

  return (
    <>
      <FeedEngagementSheet
        open={open}
        onClose={() => {
          setSelectedClient(null);
          onClose();
        }}
        titleId="views-sheet-title"
        title={`${viewsCount.toLocaleString('pt-BR')} Visualizações`}
        modal={!selectedClient}
      >
        <AnonymousExplorersRow count={anonymousCount} />
        {loading ? (
          <div className="space-y-3 py-2">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="flex items-center gap-3 py-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-3.5 w-32" />
              </div>
            ))}
          </div>
        ) : viewers.length > 0 ? (
          viewers.map((user) => (
            <FeedListUserRow key={user.id} user={user} onSelect={setSelectedClient} />
          ))
        ) : (
          <p className="py-6 text-center text-[13px] text-zinc-500">
            Nenhum perfil autenticado visualizou esta obra ainda.
          </p>
        )}
      </FeedEngagementSheet>
      <SpotlightModal client={selectedClient} onClose={() => setSelectedClient(null)} />
    </>
  );
}

function FeedSaveButton({
  postId,
  isSaved,
  onToggle,
  onSaved,
}: {
  postId: string;
  isSaved: boolean;
  onToggle: (postId: string) => void;
  onSaved: () => void;
}) {
  const { triggerHaptic } = useHapticFeedback();

  return (
    <button
      type="button"
      data-gallery-action=""
      onClick={() => {
        triggerHaptic('light');
        if (!isSaved) onSaved();
        onToggle(postId);
      }}
      className={cn(
        FEED_ACTION_BTN_CLASS,
        'flex-shrink-0 self-center',
        isSaved && 'text-[#FF6600] border-[#FF6600]/50'
      )}
      aria-label="Salvar"
      aria-pressed={isSaved}
    >
      <Bookmark
        className="h-6 w-6 shrink-0"
        strokeWidth={2}
        fill={isSaved ? 'currentColor' : 'none'}
      />
      <span className={FEED_ACTION_METRIC_CLASS}>{formatNumber(isSaved ? 851 : 850)}</span>
    </button>
  );
}

function FeedSaveToast({ open }: { open: boolean }) {
  const mounted = useSyncExternalStore(clientMountedSubscribe, () => true, () => false);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="feed-save-toast"
          role="status"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.8 }}
          className="pointer-events-auto fixed inset-x-0 z-[90] flex justify-center px-4"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.75rem)' }}
        >
          <div className="flex w-full max-w-[360px] items-center justify-between gap-3 rounded-full border border-white/10 bg-[#121212]/90 px-4 py-2 text-[12px] text-white backdrop-blur-lg">
            <span className="font-medium tracking-wide">Salvo nas inspirações</span>
            <button
              type="button"
              className="shrink-0 font-semibold text-[#FF6600] transition-transform active:scale-95"
            >
              Alterar pasta
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

const TATTOO_DNA_PILL_CLASS =
  'flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/50 border border-white/5';

function DnaLiveLed() {
  return (
    <div className="w-1.5 h-1.5 rounded-full bg-[#FF6600] shadow-[0_0_8px_rgba(255,102,0,0.8)] animate-pulse"></div>
  );
}

const HUD_GLASS_RAIL_STYLE = {
  backgroundColor: 'rgba(249,115,22,0.13)',
  maskImage: 'linear-gradient(to bottom, transparent 0%, #000 12%, #000 100%)',
  WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, #000 12%, #000 100%)',
} as const;

const HUD_GLASS_RAIL_STROKE = 'rgba(249,115,22,0.13)';

function HudAmbientLightBridge() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -inset-x-3 -bottom-8 top-8 -z-10 overflow-visible"
    >
      <div
        className="absolute inset-0 rounded-[48px] blur-3xl"
        style={{
          background:
            'radial-gradient(ellipse 88% 72% at 50% 42%, rgba(249,115,22,0.22) 0%, rgba(249,115,22,0.10) 38%, rgba(249,115,22,0.04) 58%, transparent 74%)',
        }}
      />
    </div>
  );
}

function HudGlassRailElbow({ side }: { side: 'left' | 'right' }) {
  const isLeft = side === 'left';
  return (
    <svg
      aria-hidden
      className={
        isLeft
          ? 'absolute -left-1.5 bottom-0 h-1.5 w-1.5 overflow-visible'
          : 'absolute -right-1.5 bottom-0 h-1.5 w-1.5 overflow-visible'
      }
      viewBox="0 0 6 6"
      fill="none"
    >
      <path
        d={isLeft ? 'M 0 0 L 6 6' : 'M 6 0 L 0 6'}
        stroke={HUD_GLASS_RAIL_STROKE}
        strokeWidth="1"
        strokeLinecap="butt"
        strokeLinejoin="miter"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function HudArchitecturalRails() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-visible"
    >
      <span className="absolute -left-1.5 top-0 bottom-1.5 w-px" style={HUD_GLASS_RAIL_STYLE} />
      <span className="absolute -right-1.5 top-0 bottom-1.5 w-px" style={HUD_GLASS_RAIL_STYLE} />
      <HudGlassRailElbow side="left" />
      <HudGlassRailElbow side="right" />
    </div>
  );
}

function ArtistProfileStructuralPillars() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute left-0 top-full z-10 h-4 w-px"
        style={{ backgroundColor: HUD_GLASS_RAIL_STROKE }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-full z-10 h-4 w-px"
        style={{ backgroundColor: HUD_GLASS_RAIL_STROKE }}
      />
    </>
  );
}

function HudCuratorshipFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate mx-3 mb-4 mt-2">
      <HudAmbientLightBridge />
      <HudArchitecturalRails />
      {children}
    </div>
  );
}

function TattooDnaSpecsBar() {
  return (
    <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar scroll-smooth">
      <div className={TATTOO_DNA_PILL_CLASS}>
        <DnaLiveLed />
        <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Sessão</span>
        <span className="font-mono text-xs text-white">4H</span>
      </div>
      <div className={TATTOO_DNA_PILL_CLASS}>
        <DnaLiveLed />
        <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Agulha</span>
        <span className="font-mono text-xs text-white">3RL</span>
      </div>
      <div className={TATTOO_DNA_PILL_CLASS}>
        <DnaLiveLed />
        <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Tinta</span>
        <span className="font-mono text-xs text-white">Blackwash</span>
      </div>
    </div>
  );
}

const DOUBLE_TAP_MS = 320;
const LIKE_BURST_MS = 800;
const FEED_ZOOM_SNAP_MS = 220;

function snapFeedZoom(ref: ReactZoomPanPinchRef) {
  if (ref.state.scale === 1 && ref.state.positionX === 0 && ref.state.positionY === 0) {
    return;
  }
  void ref.resetTransform(FEED_ZOOM_SNAP_MS, 'easeOut');
}

function FeedPinchZoom({ children }: { children: ReactNode }) {
  return (
    <TransformWrapper
      minScale={1}
      maxScale={4}
      limitToBounds
      disablePadding
      centerZoomedOut
      wheel={{ disabled: true }}
      panning={{ disabled: true, velocityDisabled: false }}
      pinch={{ disabled: false, allowPanning: true }}
      doubleClick={{ disabled: true }}
      autoAlignment={{
        disabled: false,
        animationTime: FEED_ZOOM_SNAP_MS,
        animationType: 'easeOut',
      }}
      velocityAnimation={{
        disabled: false,
        sensitivityTouch: 1.15,
        animationTime: 280,
        animationType: 'easeOut',
      }}
      onPinchStop={snapFeedZoom}
      onPanningStop={snapFeedZoom}
      onZoomStop={snapFeedZoom}
    >
      <TransformComponent
        wrapperClass="!absolute !inset-0 !h-full !w-full"
        contentClass="!flex !h-full !w-full"
        wrapperStyle={{ width: '100%', height: '100%', overflow: 'hidden' }}
        contentStyle={{ width: '100%', height: '100%' }}
      >
        {children}
      </TransformComponent>
    </TransformWrapper>
  );
}

function aspectFor(index: number): string {
  return ASPECTS[index % ASPECTS.length];
}

function TrackedPostCard({
  postId,
  children,
  ...props
}: ComponentPropsWithoutRef<'article'> & { postId: string }) {
  const viewRef = useViewTracker(postId);
  return (
    <article ref={viewRef} {...props}>
      {children}
    </article>
  );
}

type GalleryInspirationGridProps = {
  items: InspirationItem[];
  loading?: boolean;
  skeletonCount?: number;
  onExploreStyle?: (style: string) => void;
  onStartConversation?: (tatuadorId: string, artworkId: string) => void;
  layout?: 'masonry' | 'carousel' | 'feed';
  showLike?: boolean;
  actionCard?: ReactNode;
  savedIds?: string[];
};

const CAROUSEL_CLASS =
  '-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-4 pb-2 [-webkit-overflow-scrolling:touch] scrollbar-none sm:-mx-6 sm:px-6';

export function GalleryInspirationGrid({
  items,
  loading = false,
  skeletonCount = 6,
  onExploreStyle,
  onStartConversation,
  layout = 'masonry',
  showLike = true,
  actionCard,
  savedIds = [],
}: GalleryInspirationGridProps) {
  const { t } = useI18n();
  const { styleLabel } = portfolioLabelResolver(t);
  const router = useRouter();
  const { triggerHaptic } = useHapticFeedback();
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const setPendingChatPeer = useUiStore((s) => s.setPendingChatPeer);
  const setPendingChatArtwork = useUiStore((s) => s.setPendingChatArtwork);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [savedOverrides, setSavedOverrides] = useState<Record<string, boolean>>({});
  const confirmedSaved = useMemo(() => {
    const next = new Set(savedIds);
    for (const [id, value] of Object.entries(savedOverrides)) {
      if (value) next.add(id);
      else next.delete(id);
    }
    return next;
  }, [savedIds, savedOverrides]);
  const [optimisticSaved, applyOptimisticSave] = useOptimistic(
    confirmedSaved,
    (current, postId: string) => {
      const next = new Set(current);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    }
  );
  const [, startSaveTransition] = useTransition();
  const [isSaveToastOpen, setIsSaveToastOpen] = useState(false);
  const [preview, setPreview] = useState<GalleryPreviewItem | null>(null);
  const [likeBurst, setLikeBurst] = useState<{ id: string; nonce: number } | null>(null);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [budgetItem, setBudgetItem] = useState<InspirationItem | null>(null);
  const [isLikesModalOpen, setIsLikesModalOpen] = useState(false);
  const [likesSheetCount, setLikesSheetCount] = useState(0);
  const [isViewsModalOpen, setIsViewsModalOpen] = useState(false);
  const [viewsSheetPostId, setViewsSheetPostId] = useState<string | null>(null);
  const [viewsSheetCount, setViewsSheetCount] = useState(0);

  const pressTimer = useRef<number | null>(null);
  const pressOrigin = useRef<{ x: number; y: number } | null>(null);
  const suppressClickUntil = useRef(0);
  const lastFeedTap = useRef<{ id: string; at: number } | null>(null);
  const burstTimer = useRef<number | null>(null);

  const cancelLongPress = useCallback(() => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    pressOrigin.current = null;
  }, []);

  useEffect(
    () => () => {
      cancelLongPress();
      if (burstTimer.current !== null) window.clearTimeout(burstTimer.current);
    },
    [cancelLongPress]
  );

  const startLongPress =
    (item: InspirationItem) => (event: ReactPointerEvent<HTMLElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const target = event.target;
      if (target instanceof Element && target.closest('[data-gallery-action]')) return;

      cancelLongPress();
      pressOrigin.current = { x: event.clientX, y: event.clientY };
      pressTimer.current = window.setTimeout(() => {
        pressTimer.current = null;
        pressOrigin.current = null;
        suppressClickUntil.current = Date.now() + CLICK_SUPPRESSION_MS;
        triggerHaptic('medium');
        setPreview(item);
      }, LONG_PRESS_MS);
    };

  const moveLongPress = (event: ReactPointerEvent<HTMLElement>) => {
    const origin = pressOrigin.current;
    if (!origin) return;
    if (
      Math.hypot(event.clientX - origin.x, event.clientY - origin.y) >
      LONG_PRESS_MOVE_TOLERANCE
    ) {
      cancelLongPress();
    }
  };

  const consumeLongPressClick = useCallback((event?: { preventDefault: () => void; stopPropagation: () => void }) => {
    if (Date.now() < suppressClickUntil.current) {
      suppressClickUntil.current = 0;
      event?.preventDefault();
      event?.stopPropagation();
      return true;
    }
    return false;
  }, []);

  const openInspiration = (item: InspirationItem) => {
    triggerHaptic('light');
    setPreview(item);
  };

  const visitArtistProfile = (item: InspirationItem) => {
    triggerHaptic('light');
    router.push(artistProfileHref({ id: item.artistId, username: item.artistUsername }));
  };

  const handleInspirationClick = (
    item: InspirationItem,
    event?: { preventDefault: () => void; stopPropagation: () => void }
  ) => {
    if (consumeLongPressClick(event)) return;
    openInspiration(item);
  };

  const toggleLiked = (id: string) => {
    setLiked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const persistToggleSave = useCallback((postId: string) => {
    startSaveTransition(async () => {
      applyOptimisticSave(postId);
      const result = await toggleSave(postId);
      if (!result.success) return;
      setSavedOverrides((prev) => ({ ...prev, [postId]: result.isSaved }));
    });
  }, [applyOptimisticSave]);

  useEffect(() => {
    if (!isSaveToastOpen) return;
    const timer = window.setTimeout(() => setIsSaveToastOpen(false), 3000);
    return () => window.clearTimeout(timer);
  }, [isSaveToastOpen]);

  const shareInspiration = (item: InspirationItem) => {
    triggerHaptic('light');
    const href = artistProfileHref({ id: item.artistId, username: item.artistUsername });
    const url = typeof window === 'undefined' ? href : `${window.location.origin}${href}`;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      void navigator.share({ title: item.artistName, url }).catch(() => undefined);
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(url);
    }
  };

  const likeFromDoubleTap = useCallback(
    (id: string) => {
      cancelLongPress();
      setLiked((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
      setLikeBurst((current) => ({
        id,
        nonce: current?.id === id ? current.nonce + 1 : 1,
      }));
      triggerHaptic('heavy');
      if (burstTimer.current !== null) window.clearTimeout(burstTimer.current);
      burstTimer.current = window.setTimeout(() => {
        burstTimer.current = null;
        setLikeBurst((current) => (current?.id === id ? null : current));
      }, LIKE_BURST_MS);
    },
    [cancelLongPress, triggerHaptic]
  );

  const handleFeedImagePointerUp =
    (item: InspirationItem) => (event: ReactPointerEvent<HTMLElement>) => {
      cancelLongPress();
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (Date.now() < suppressClickUntil.current) return;

      const now = Date.now();
      const last = lastFeedTap.current;
      if (last && last.id === item.id && now - last.at <= DOUBLE_TAP_MS) {
        lastFeedTap.current = null;
        likeFromDoubleTap(item.id);
        return;
      }
      lastFeedTap.current = { id: item.id, at: now };
    };

  const dismissPreview = useCallback(() => setPreview(null), []);

  const visitPreviewProfile = useCallback(
    (item: GalleryPreviewItem) => {
      setPreview(null);
      triggerHaptic('light');
      router.push(
        item.artistId || item.artistUsername
          ? artistProfileHref({ id: item.artistId, username: item.artistUsername })
          : '/dashboard/galeria'
      );
    },
    [router, triggerHaptic]
  );

  const explorePreviewStyles = useCallback(
    (item: GalleryPreviewItem) => {
      setPreview(null);
      triggerHaptic('light');
      onExploreStyle?.(item.style || '');
    },
    [onExploreStyle, triggerHaptic]
  );

  const isCarousel = layout === 'carousel';
  const isFeed = layout === 'feed';

  if (loading) {
    if (isCarousel) {
      return (
        <div className={CAROUSEL_CLASS} aria-hidden>
          {Array.from({ length: Math.min(skeletonCount, 6) }, (_, index) => (
            <Skeleton
              key={index}
              className="h-[15.5rem] w-[11.5rem] shrink-0 snap-start rounded-xl"
            />
          ))}
        </div>
      );
    }
    if (isFeed) {
      return (
        <div className={FEED_LIST_CLASS} aria-hidden>
          {Array.from({ length: skeletonCount }, (_, index) => (
            <article
              key={index}
              className="flex flex-col w-full max-w-none relative mb-2 px-0 mx-0 overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 w-full bg-transparent">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full object-cover ring-1 ring-white/10" />
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-2.5 w-20" />
                  </div>
                </div>
                <Skeleton className="h-7 w-[5.5rem] rounded-full border border-orange-500/30 bg-orange-500/5 shadow-[0_0_10px_rgba(249,115,22,0.05)]" />
              </div>
              <div className="relative w-full aspect-[9/16] overflow-hidden bg-white/5">
                <Skeleton className="h-full w-full rounded-none" />
                <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none z-10"></div>
              </div>
              <HudCuratorshipFrame>
              <motion.div
                className={HUD_CURATORSHIP_CLASS}
                style={HUD_CURATORSHIP_STYLE}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                viewport={{ once: true, margin: '-20px' }}
              >
              <div className="w-full max-w-none my-1">
                <div className="flex w-full flex-row items-center justify-between border border-white/10 rounded-full overflow-hidden bg-transparent">
                  <div className={cn(FEED_TOP_ACTION_BTN_CLASS, FEED_TOP_ACTION_DIVIDER_CLASS)}>
                    <Skeleton className="h-6 w-6 rounded-full border border-white/10 bg-white/[0.02]" />
                    <Skeleton className="h-3 w-7" />
                  </div>
                  <div className={cn(FEED_TOP_ACTION_BTN_CLASS, FEED_TOP_ACTION_DIVIDER_CLASS)}>
                    <Skeleton className="h-6 w-6 rounded-full border border-white/10 bg-white/[0.02]" />
                    <Skeleton className="h-3 w-6" />
                  </div>
                  <div className={cn(FEED_TOP_ACTION_BTN_CLASS, FEED_TOP_ACTION_DIVIDER_CLASS)}>
                    <Skeleton className="h-6 w-6 rounded-full border border-white/10 bg-white/[0.02]" />
                    <Skeleton className="h-3 w-5" />
                  </div>
                  <div className={FEED_TOP_ACTION_BTN_CLASS}>
                    <Skeleton className="h-6 w-6 rounded-full border border-white/10 bg-white/[0.02]" />
                    <Skeleton className="h-3 w-6" />
                  </div>
                </div>
              </div>
              <div className="flex flex-row justify-between items-center gap-4 relative w-full bg-[#0a0a0c] border border-white/[0.04] rounded-[24px] p-4 mt-2 mb-4 shadow-lg">
                <div className="flex flex-col flex-1">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="mt-1.5 h-3 w-full" />
                  <Skeleton className="mt-2 h-3 w-24" />
                </div>
                <div className="flex-shrink-0 self-center flex items-center gap-1.5 px-3 py-1.5">
                  <Skeleton className="h-6 w-6 rounded-xl border border-white/10 bg-white/[0.02]" />
                  <Skeleton className="h-3 w-6" />
                </div>
              </div>
                <TattooDnaSpecsBar />
              </motion.div>
              </HudCuratorshipFrame>
            </article>
          ))}
        </div>
      );
    }
    return (
      <div className={GRID_CLASS} aria-hidden>
        {Array.from({ length: skeletonCount }, (_, index) => (
          <Skeleton
            key={index}
            className={cn(GRID_TILE_CLASS, aspectFor(index))}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <div
        className={
          isCarousel ? CAROUSEL_CLASS : isFeed ? FEED_LIST_CLASS : GRID_CLASS
        }
      >
        {items.map((item) => {
          const isLiked = Boolean(liked[item.id]);
          const isSaved = optimisticSaved.has(item.id);
          const artistName = item.artistName || t('welcome.artistFallback');

          if (isFeed) {
            const artistInitial = item.artistInitial || artistName.charAt(0) || 'A';
            const profileHref = artistProfileHref({
              id: item.artistId,
              username: item.artistUsername,
            });
            const metaLine = [styleLabel(item.style), item.location].filter(Boolean).join(' · ');
            const likeCount = item.likes + (isLiked ? 1 : 0);
            const likeLabel = `Curtido por ${likeCount.toLocaleString('pt-BR')} pessoas`;
            const caption =
              item.description?.trim() ||
              `${styleLabel(item.style)} disponível para orçamento.`;

            return (
              <TrackedPostCard
                key={item.id}
                postId={item.id}
                onPointerDown={startLongPress(item)}
                onPointerMove={moveLongPress}
                onPointerUp={cancelLongPress}
                onPointerCancel={cancelLongPress}
                onPointerLeave={cancelLongPress}
                onContextMenu={(event) => event.preventDefault()}
              className="flex flex-col w-full max-w-none relative z-0 mb-2 px-0 mx-0 overflow-visible"
              >
                <div className="relative my-4 overflow-visible">
                  <ArtistProfileStructuralPillars />
                  <div className="relative flex items-center justify-between w-full px-4 py-3 rounded-[12px] border border-white/10 border-t-white/15 bg-gradient-to-r from-zinc-950/80 via-[#0a0a0c]/75 to-[#1a0c05]/80 backdrop-blur-2xl shadow-[0_-1px_20px_rgba(255,255,255,0.02),0_12px_28px_-10px_rgba(0,0,0,0.55)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:rounded-t-[12px] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent">
                  <div className="flex min-w-0 items-center gap-3">
                    {item.artistAvatarUrl ? (
                      <OptimizedImage
                        src={item.artistAvatarUrl}
                        alt={artistName}
                        className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-white/10"
                      />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold uppercase text-zinc-100 ring-1 ring-white/10">
                        {artistInitial}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold tracking-tight text-white">
                        {artistName}
                      </p>
                      {metaLine ? (
                        <p className="truncate text-xs tracking-wide text-zinc-400">{metaLine}</p>
                      ) : null}
                    </div>
                  </div>
                  <Link
                    href={profileHref}
                    data-gallery-action=""
                    className="flex items-center justify-center text-center whitespace-nowrap flex-shrink-0 px-5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[11px] font-bold uppercase tracking-wider backdrop-blur-sm transition-all duration-300 active:scale-95 hover:bg-orange-500/20 hover:border-orange-500/40 hover:shadow-[0_0_12px_rgba(249,115,22,0.15)]"
                  >
                    VISITAR PERFIL
                  </Link>
                  </div>
                </div>

                <div
                  onPointerUp={handleFeedImagePointerUp(item)}
                  className="relative isolate w-full aspect-[9/16] overflow-hidden bg-white/5 contain-paint"
                >
                    <FeedPinchZoom>
                    <motion.div
                      layout="position"
                      layoutId={galleryPreviewLayoutId(item.id)}
                      transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.8 }}
                      style={{ backfaceVisibility: 'hidden' }}
                      className="relative h-full w-full [backface-visibility:hidden]"
                    >
                      <OptimizedImage
                        src={item.imageUrl}
                        alt={`${styleLabel(item.style)} — ${artistName}`}
                        className="object-cover w-full h-full"
                      />
                    </motion.div>
                    </FeedPinchZoom>
                    <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none z-10"></div>
                    <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center text-green-500 drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                      <AnimatePresence>
                        {likeBurst?.id === item.id ? (
                          <motion.span
                            key={likeBurst.nonce}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: [0, 1.2, 1], opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                            className="flex h-24 w-24 items-center justify-center transform-gpu will-change-transform [backface-visibility:hidden] [transform:translateZ(0)]"
                            style={{ backfaceVisibility: 'hidden' }}
                          >
                            <TattooMachineLikeGlyph
                              liked
                              className="h-24 w-24 text-green-500 drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                            />
                          </motion.span>
                        ) : null}
                      </AnimatePresence>
                    </div>
                  </div>

              <HudCuratorshipFrame>
              <motion.div
                className={HUD_CURATORSHIP_CLASS}
                style={HUD_CURATORSHIP_STYLE}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                viewport={{ once: true, margin: '-20px' }}
              >
                <div className="w-full max-w-none my-1">
                  <div className="flex w-full flex-row items-center justify-between border border-white/10 rounded-full overflow-hidden bg-transparent">
                    {showLike ? (
                      <div
                        className={cn(
                          FEED_TOP_ACTION_BTN_CLASS,
                          FEED_TOP_ACTION_DIVIDER_CLASS,
                          isLiked && 'text-orange-500'
                        )}
                      >
                        <button
                          type="button"
                          data-gallery-action=""
                          onClick={() => {
                            triggerHaptic('light');
                            toggleLiked(item.id);
                          }}
                          className="flex items-center justify-center"
                          aria-label={isLiked ? t('aria.unlike') : t('aria.like')}
                          aria-pressed={isLiked}
                        >
                          <TattooMachineLikeGlyph liked={isLiked} className="h-6 w-6 shrink-0" />
                        </button>
                        <button
                          type="button"
                          data-gallery-action=""
                          onClick={() => {
                            triggerHaptic('light');
                            setLikesSheetCount(likeCount);
                            setIsLikesModalOpen(true);
                          }}
                          className={FEED_TOP_ACTION_METRIC_CLASS}
                          aria-label={likeLabel}
                        >
                          {formatNumber(12300)}
                        </button>
                      </div>
                    ) : null}
                    <button
                      type="button"
                      data-gallery-action=""
                      onClick={() => {
                        triggerHaptic('light');
                        setViewsSheetPostId(item.id);
                        setViewsSheetCount(item.viewsCount ?? 0);
                        setIsViewsModalOpen(true);
                      }}
                      className={cn(FEED_TOP_ACTION_BTN_CLASS, FEED_TOP_ACTION_DIVIDER_CLASS)}
                      aria-label={`${(item.viewsCount ?? 0).toLocaleString('pt-BR')} visualizações`}
                    >
                      <Eye className="h-6 w-6 shrink-0" strokeWidth={2} />
                      <span className={FEED_TOP_ACTION_METRIC_CLASS}>
                        {formatNumber(12300)}
                      </span>
                    </button>
                    <button
                      type="button"
                      data-gallery-action=""
                      onClick={() => {
                        setBudgetItem(item);
                        setIsBudgetModalOpen(true);
                      }}
                      className={cn(FEED_TOP_ACTION_BTN_CLASS, FEED_TOP_ACTION_DIVIDER_CLASS)}
                      aria-label={t('chat.quotes')}
                    >
                      <ReceiptText className="h-6 w-6 shrink-0" strokeWidth={2} />
                      <span className={FEED_TOP_ACTION_METRIC_CLASS}>{formatNumber(12300000)}</span>
                    </button>
                    <button
                      type="button"
                      data-gallery-action=""
                      onClick={() => shareInspiration(item)}
                      className={FEED_TOP_ACTION_BTN_CLASS}
                      aria-label="Compartilhar"
                    >
                      <Send className="h-6 w-6 shrink-0" strokeWidth={2} />
                      <span className={FEED_TOP_ACTION_METRIC_CLASS}>{formatNumber(12300000)}</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-row justify-between items-center gap-4 relative w-full bg-[#0a0a0c] border border-white/[0.04] rounded-[24px] p-4 mt-2 mb-4 shadow-lg">
                  <div className="flex flex-col flex-1">
                    <p className="leading-tight">
                      <span className="mr-2 font-bold text-[14px] text-white">
                        {artistName}
                      </span>
                      <span className="text-[13px] leading-tight text-gray-400">{caption}</span>
                    </p>
                    <button
                      type="button"
                      data-gallery-action=""
                      aria-label={isLiked ? t('aria.unlike') : t('aria.like')}
                      aria-pressed={isLiked}
                      onClick={() => {
                        triggerHaptic('light');
                        toggleLiked(item.id);
                      }}
                      className="flex flex-row items-center gap-1.5 mt-2 cursor-pointer transition-transform active:scale-95 touch-manipulation group"
                    >
                      <Heart className="h-3.5 w-3.5 shrink-0 text-white/80 group-hover:text-red-500 transition-colors" strokeWidth={2} fill="currentColor" />
                      <span className="text-sm font-normal text-white/70 group-hover:text-white transition-colors">
                        {likeCount.toLocaleString('pt-BR')} curtidas
                      </span>
                    </button>
                    <button
                      type="button"
                      data-gallery-action=""
                      aria-label={`${(item.viewsCount ?? 0).toLocaleString('pt-BR')} visualizações`}
                      onClick={() => {
                        triggerHaptic('light');
                        setLikesSheetCount(likeCount);
                        setIsLikesModalOpen(true);
                      }}
                      className="mt-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-white/80 hover:text-white active:scale-95 transition-all cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                      <span>{(item.viewsCount ?? 0).toLocaleString('pt-BR')} visualizações</span>
                    </button>
                  </div>
                  <FeedSaveButton
                    postId={item.id}
                    isSaved={isSaved}
                    onToggle={persistToggleSave}
                    onSaved={() => setIsSaveToastOpen(true)}
                  />
                </div>
              <TattooDnaSpecsBar />
              </motion.div>
              </HudCuratorshipFrame>
              </TrackedPostCard>
            );
          }

          return (
            <TrackedPostCard
              key={item.id}
              postId={item.id}
              onPointerDown={startLongPress(item)}
              onPointerMove={moveLongPress}
              onPointerUp={cancelLongPress}
              onPointerCancel={cancelLongPress}
              onPointerLeave={cancelLongPress}
              onContextMenu={(event) => event.preventDefault()}
              className={cn(
                'group relative select-none overflow-hidden',
                isCarousel
                  ? 'h-[15.5rem] w-[11.5rem] shrink-0 snap-start rounded-xl border border-zinc-800/50 bg-zinc-900/40'
                  : GRID_TILE_CLASS
              )}
            >
              <motion.div
                layout="position"
                layoutId={galleryPreviewLayoutId(item.id)}
                transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.8 }}
                style={{ backfaceVisibility: 'hidden' }}
                className="absolute inset-0 transform-gpu will-change-transform [backface-visibility:hidden] [transform:translateZ(0)]"
              >
                <OptimizedImage
                  src={item.imageUrl}
                  alt={`${styleLabel(item.style)} — ${artistName}`}
                  className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-[1.04]"
                />
              </motion.div>
              {isCarousel ? (
                <>
                  <button
                    type="button"
                    onClick={(event) => handleInspirationClick(item, event)}
                    className="absolute inset-0 z-[1]"
                    aria-label={artistName}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 z-[2] flex items-end justify-between gap-2 p-3">
                    <div className="pointer-events-none min-w-0">
                      <p className="truncate text-[13px] font-semibold text-white">{artistName}</p>
                      <p className="truncate text-[11px] text-zinc-300/90">{styleLabel(item.style)}</p>
                    </div>
                    {showLike ? (
                      <TattooLikeButton
                        liked={isSaved}
                        onToggle={() => persistToggleSave(item.id)}
                        showCount={false}
                        dataGalleryAction
                        ariaLabel={isSaved ? t('aria.unlike') : t('aria.like')}
                        className="pointer-events-auto h-10 w-10 min-h-10 min-w-10 border border-orange-500/40 bg-black/55 p-0 text-orange-500 backdrop-blur-md"
                        iconClassName="h-[18px] w-[18px]"
                      />
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={(event) => handleInspirationClick(item, event)}
                    className="absolute inset-0 z-[1]"
                    aria-label={artistName}
                  />
                  {showLike ? (
                    <div className="absolute right-3 top-3 z-[5]">
                      <TattooLikeButton
                        liked={isSaved}
                        onToggle={() => persistToggleSave(item.id)}
                        showCount={false}
                        dataGalleryAction
                        ariaLabel={isSaved ? t('aria.unlike') : t('aria.like')}
                        className="h-11 w-11 min-h-11 min-w-11 border border-orange-500/40 bg-black/55 p-0 text-orange-500 shadow-[0_0_18px_rgba(249,115,22,0.28)] backdrop-blur-md"
                        iconClassName="h-5 w-5"
                      />
                    </div>
                  ) : null}
                  <button
                    type="button"
                    data-gallery-action=""
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (consumeLongPressClick(event)) return;
                      visitArtistProfile(item);
                    }}
                    className="absolute bottom-3 right-3 z-[5] rounded-full border border-orange-500/40 bg-orange-500/15 px-4 py-2 text-sm font-semibold text-orange-400 backdrop-blur-md"
                    aria-label={t('gallery.visitProfile')}
                  >
                    {t('gallery.visitProfile')}
                  </button>
                </>
              )}
            </TrackedPostCard>
          );
        })}
        {isCarousel ? actionCard : null}
      </div>

      <GalleryHapticPreview
        item={preview}
        onDismiss={dismissPreview}
        onVisitProfile={visitPreviewProfile}
        onExploreStyles={explorePreviewStyles}
        showLike={showLike}
      />

      <FeedSaveToast open={isSaveToastOpen} />

      <FeedLikesSheet
        open={isLikesModalOpen}
        likeCount={likesSheetCount}
        onClose={() => setIsLikesModalOpen(false)}
      />

      <FeedViewsSheet
        open={isViewsModalOpen}
        postId={viewsSheetPostId}
        viewsCount={viewsSheetCount}
        onClose={() => setIsViewsModalOpen(false)}
      />

      <BudgetEstimatorSheet
        open={isBudgetModalOpen}
        item={budgetItem}
        onClose={() => setIsBudgetModalOpen(false)}
        onRequestQuote={({ artistId, artworkId }) => {
          setIsBudgetModalOpen(false);
          if (!artistId) return;
          if (onStartConversation) {
            onStartConversation(artistId, artworkId);
            return;
          }
          setPendingChatPeer(artistId);
          setPendingChatArtwork(artworkId);
          setActiveTab('chat');
          const params = new URLSearchParams({
            artistId,
            artworkId,
          });
          router.push(`/dashboard/chat?${params.toString()}`);
        }}
        onQuoteAlternative={({ artistId, artworkId }) => {
          setIsBudgetModalOpen(false);
          if (!artistId) return;
          if (onStartConversation) {
            onStartConversation(artistId, artworkId);
            return;
          }
          setPendingChatPeer(artistId);
          setPendingChatArtwork(artworkId);
          setActiveTab('chat');
          const params = new URLSearchParams({
            artistId,
            artworkId,
          });
          router.push(`/dashboard/chat?${params.toString()}`);
        }}
      />
    </>
  );
}
