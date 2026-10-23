'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Bookmark, FileText, Heart, Send } from 'lucide-react';
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
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { useUiStore } from '@/hooks/use-ui-store';
import { CLICK_SUPPRESSION_MS, LONG_PRESS_MS, LONG_PRESS_MOVE_TOLERANCE } from '@/hooks/use-long-press-preview';
import type { InspirationItem } from '@/lib/gallery-mock';
import { portfolioLabelResolver } from '@/lib/portfolio-metadata';
import { artistProfileHref } from '@/lib/artist-profile';
import { cn } from '@/lib/utils';

const ASPECTS = ['aspect-[4/5]', 'aspect-square', 'aspect-[3/4]', 'aspect-[4/5]', 'aspect-square'] as const;

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
  'flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.02] px-1.5 text-zinc-300 transition-all hover:border-orange-500/50';

const FEED_ACTION_METRIC_CLASS =
  'text-[11px] font-semibold tracking-wide text-gray-300 whitespace-nowrap';

const FEED_LIKES_PLACEHOLDERS = [
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
] as const;

const likesSheetSubscribe = () => () => {};

function FeedLikesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mounted = useSyncExternalStore(likesSheetSubscribe, () => true, () => false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="likes-sheet"
          className="fixed inset-0 z-[60] flex h-[100dvh] w-full flex-col justify-end overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.button
            type="button"
            aria-label="Fechar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-black/40"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="likes-sheet-title"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 42, mass: 0.9 }}
            className="relative flex max-h-[80dvh] w-full flex-col overflow-hidden rounded-t-3xl border-t border-white/10 bg-[#121212]/80 backdrop-blur-xl shadow-[0_-24px_60px_rgba(0,0,0,0.55)]"
          >
            <span
              aria-hidden
              className="mx-auto mt-3 block h-1 w-10 shrink-0 rounded-full bg-white/20"
            />
            <header className="shrink-0 px-5 pb-2 pt-4">
              <h2
                id="likes-sheet-title"
                className="text-[15px] font-semibold tracking-tight text-orange-500"
              >
                2.418 Curtidas
              </h2>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {FEED_LIKES_PLACEHOLDERS.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 border-b border-white/5 py-3 last:border-b-0"
                >
                  <OptimizedImage
                    src={user.avatarUrl}
                    alt={user.username}
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                  />
                  <span className="truncate text-[14px] font-medium text-zinc-100">
                    {user.username}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
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

type GalleryInspirationGridProps = {
  items: InspirationItem[];
  loading?: boolean;
  skeletonCount?: number;
  onExploreStyle?: (style: string) => void;
  onStartConversation?: (tatuadorId: string, artworkId: string) => void;
  layout?: 'masonry' | 'carousel' | 'feed';
  showLike?: boolean;
  actionCard?: ReactNode;
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
}: GalleryInspirationGridProps) {
  const { t } = useI18n();
  const { styleLabel } = portfolioLabelResolver(t);
  const router = useRouter();
  const { triggerHaptic } = useHapticFeedback();
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const setPendingChatPeer = useUiStore((s) => s.setPendingChatPeer);
  const setPendingChatArtwork = useUiStore((s) => s.setPendingChatArtwork);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [bookmarked, setBookmarked] = useState<Record<string, boolean>>({});
  const [preview, setPreview] = useState<GalleryPreviewItem | null>(null);
  const [likeBurst, setLikeBurst] = useState<{ id: string; nonce: number } | null>(null);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [budgetItem, setBudgetItem] = useState<InspirationItem | null>(null);
  const [isLikesModalOpen, setIsLikesModalOpen] = useState(false);

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
    router.push(artistProfileHref({ id: item.artistId, username: item.artistUsername }));
  };

  const handleInspirationClick = (
    item: InspirationItem,
    event?: { preventDefault: () => void; stopPropagation: () => void }
  ) => {
    if (consumeLongPressClick(event)) return;
    openInspiration(item);
  };

  const toggleSaved = (id: string) => {
    setSaved((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleBookmarked = (id: string) => {
    setBookmarked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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
      setSaved((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
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
        <div className="flex w-full max-w-none flex-col px-0 mx-0 pb-[calc(env(safe-area-inset-bottom)+8rem)]" aria-hidden>
          {Array.from({ length: skeletonCount }, (_, index) => (
            <article
              key={index}
              className="flex flex-col w-full max-w-none relative mb-2 px-0 mx-0 overflow-visible"
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
              <div className="w-full max-w-none aspect-[4/5] relative bg-[#050505] rounded-none border border-white/10 overflow-hidden">
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
              <div className="w-full max-w-none rounded-[12px] border border-white/10 bg-zinc-950/60 backdrop-blur-md overflow-hidden my-1">
                <div className="flex w-full items-center justify-between gap-1 px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="h-10 w-10 rounded-xl border border-white/10 bg-white/[0.02]" />
                    <Skeleton className="h-3 w-7" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="h-10 w-10 rounded-xl border border-white/10 bg-white/[0.02]" />
                    <Skeleton className="h-3 w-6" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="h-10 w-10 rounded-xl border border-white/10 bg-white/[0.02]" />
                    <Skeleton className="h-3 w-5" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="h-10 w-10 rounded-xl border border-white/10 bg-white/[0.02]" />
                    <Skeleton className="h-3 w-6" />
                  </div>
                </div>
              </div>
              <div className="w-full max-w-none bg-[#0a0a0c] border border-white/[0.04] rounded-[24px] p-4 mt-2 mb-4 shadow-lg">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="mt-1.5 h-3 w-full" />
                <Skeleton className="mt-2 h-3 w-24" />
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
      <div className="columns-2 gap-4" aria-hidden>
        {Array.from({ length: skeletonCount }, (_, index) => (
          <Skeleton
            key={index}
            className={cn('mb-4 w-full break-inside-avoid rounded-xl', aspectFor(index))}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <div
        className={
          isCarousel ? CAROUSEL_CLASS : isFeed ? 'flex w-full max-w-none flex-col px-0 mx-0 overflow-visible pb-[calc(env(safe-area-inset-bottom)+8rem)]' : 'columns-2 gap-4'
        }
      >
        {items.map((item, index) => {
          const isSaved = Boolean(saved[item.id]);
          const artistName = item.artistName || t('welcome.artistFallback');

          if (isFeed) {
            const artistInitial = item.artistInitial || artistName.charAt(0) || 'A';
            const profileHref = artistProfileHref({
              id: item.artistId,
              username: item.artistUsername,
            });
            const metaLine = [styleLabel(item.style), item.location].filter(Boolean).join(' · ');
            const likeCount = item.likes + (isSaved ? 1 : 0);
            const likeLabel = `Curtido por ${likeCount.toLocaleString('pt-BR')} pessoas`;
            const caption =
              item.description?.trim() ||
              `${styleLabel(item.style)} disponível para orçamento.`;
            const isBookmarked = Boolean(bookmarked[item.id]);

            return (
              <article
                key={item.id}
                onPointerDown={startLongPress(item)}
                onPointerMove={moveLongPress}
                onPointerUp={cancelLongPress}
                onPointerCancel={cancelLongPress}
                onPointerLeave={cancelLongPress}
                onContextMenu={(event) => event.preventDefault()}
              className="flex flex-col w-full max-w-none relative mb-2 px-0 mx-0 overflow-visible"
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
                  className="w-full max-w-none aspect-[4/5] relative bg-[#050505] rounded-none border border-white/10 overflow-hidden"
                >
                    <FeedPinchZoom>
                    <motion.div
                      layout="position"
                      layoutId={galleryPreviewLayoutId(item.id)}
                      transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.8 }}
                      style={{ backfaceVisibility: 'hidden' }}
                      className="relative h-full w-full transform-gpu will-change-transform [backface-visibility:hidden] [transform:translateZ(0)]"
                    >
                      <OptimizedImage
                        src={item.imageUrl}
                        alt={`${styleLabel(item.style)} — ${artistName}`}
                        className="object-cover w-full h-full"
                      />
                    </motion.div>
                    </FeedPinchZoom>
                    <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none z-10"></div>
                    <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center text-green-500 drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]">
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
                <div className="w-full max-w-none rounded-[12px] border border-white/10 bg-zinc-950/60 backdrop-blur-md overflow-hidden my-1">
                  <div className="flex w-full items-center justify-between gap-1 px-4 py-3">
                    {showLike ? (
                      <button
                        type="button"
                        data-gallery-action=""
                        onClick={() => {
                          triggerHaptic('light');
                          toggleSaved(item.id);
                        }}
                        className={cn(
                          FEED_ACTION_BTN_CLASS,
                          isSaved && 'text-orange-500 border-orange-500/50'
                        )}
                        aria-label={isSaved ? t('aria.unlike') : t('aria.like')}
                        aria-pressed={isSaved}
                      >
                        <TattooMachineLikeGlyph liked={isSaved} className="h-6 w-6 shrink-0" />
                        <span className={FEED_ACTION_METRIC_CLASS}>2.4k</span>
                      </button>
                    ) : null}
                    <button
                      type="button"
                      data-gallery-action=""
                      onClick={() => shareInspiration(item)}
                      className={FEED_ACTION_BTN_CLASS}
                      aria-label="Compartilhar"
                    >
                      <Send className="h-6 w-6 shrink-0" strokeWidth={2} />
                      <span className={FEED_ACTION_METRIC_CLASS}>128</span>
                    </button>
                    <button
                      type="button"
                      data-gallery-action=""
                      onClick={() => {
                        setBudgetItem(item);
                        setIsBudgetModalOpen(true);
                      }}
                      className={FEED_ACTION_BTN_CLASS}
                      aria-label={t('chat.quotes')}
                    >
                      <FileText className="h-6 w-6 shrink-0" strokeWidth={2} />
                      <span className={FEED_ACTION_METRIC_CLASS}>45</span>
                    </button>
                    <button
                      type="button"
                      data-gallery-action=""
                      onClick={() => {
                        triggerHaptic('light');
                        toggleBookmarked(item.id);
                      }}
                      className={cn(
                        FEED_ACTION_BTN_CLASS,
                        isBookmarked && 'text-orange-500 border-orange-500/50'
                      )}
                      aria-label="Salvar"
                      aria-pressed={isBookmarked}
                    >
                      <Bookmark
                        className="h-6 w-6 shrink-0"
                        strokeWidth={2}
                        fill={isBookmarked ? 'currentColor' : 'none'}
                      />
                      <span className={FEED_ACTION_METRIC_CLASS}>850</span>
                    </button>
                  </div>
                </div>

                <div className="w-full max-w-none bg-[#0a0a0c] border border-white/[0.04] rounded-[24px] p-4 mt-2 mb-4 shadow-lg">
                  <p className="leading-tight">
                    <span className="mr-2 font-bold text-[14px] text-white">
                      {artistName}
                    </span>
                    <span className="text-[13px] leading-tight text-gray-400">{caption}</span>
                  </p>
                  <button
                    type="button"
                    data-gallery-action=""
                    aria-label={likeLabel}
                    onClick={() => {
                      triggerHaptic('light');
                      setIsLikesModalOpen(true);
                    }}
                    className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-white/80 hover:text-white active:scale-95 transition-all cursor-pointer"
                  >
                    <Heart className="h-3.5 w-3.5 shrink-0" strokeWidth={2} fill="currentColor" />
                    <span>{likeCount.toLocaleString('pt-BR')} curtidas</span>
                  </button>
                </div>
              <TattooDnaSpecsBar />
              </motion.div>
              </HudCuratorshipFrame>
              </article>
            );
          }

          return (
            <article
              key={item.id}
              onPointerDown={startLongPress(item)}
              onPointerMove={moveLongPress}
              onPointerUp={cancelLongPress}
              onPointerCancel={cancelLongPress}
              onPointerLeave={cancelLongPress}
              onContextMenu={(event) => event.preventDefault()}
              className={cn(
                'group relative select-none overflow-hidden rounded-xl border border-zinc-800/50 bg-zinc-900/40',
                isCarousel
                  ? 'h-[15.5rem] w-[11.5rem] shrink-0 snap-start'
                  : cn('mb-4 break-inside-avoid', aspectFor(index))
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
                  className="h-full w-full transition-transform duration-500 group-hover:scale-[1.04]"
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
                        onToggle={() => toggleSaved(item.id)}
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
                  {showLike ? (
                    <div className="absolute right-3 top-3 z-[5]">
                      <TattooLikeButton
                        liked={isSaved}
                        onToggle={() => toggleSaved(item.id)}
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
                    onClick={(event) => handleInspirationClick(item, event)}
                    className="absolute bottom-3 right-3 z-[5] rounded-full border border-orange-500/40 bg-orange-500/15 px-4 py-2 text-sm font-semibold text-orange-400 backdrop-blur-md"
                    aria-label={t('gallery.visitProfile')}
                  >
                    {t('gallery.visitProfile')}
                  </button>
                </>
              )}
            </article>
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

      <FeedLikesSheet
        open={isLikesModalOpen}
        onClose={() => setIsLikesModalOpen(false)}
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
