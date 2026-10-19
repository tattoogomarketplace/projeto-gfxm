'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, BadgeCheck, Compass, Sparkles } from 'lucide-react';
import { GalleryInspirationGrid } from '@/components/features/gallery-inspiration-grid';
import {
  GalleryHapticPreview,
  galleryPreviewLayoutId,
  type GalleryPreviewItem,
} from '@/components/features/gallery-haptic-preview';
import { useGaleria } from '@/hooks/use-galeria';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { Skeleton } from '@/components/ui/skeleton';
import { BRAND_NAME } from '@/lib/i18n/brands';
import {
  HOME_GALLERY_TEASER_LIMIT,
  PLACEHOLDER_INSPIRATIONS,
  type InspirationItem,
} from '@/lib/gallery-mock';
import { PORTFOLIO_STYLES, portfolioLabelResolver } from '@/lib/portfolio-metadata';
import { cn } from '@/lib/utils';
import type { GaleriaItem } from '@/lib/types/galeria';

/**
 * TATTOOGO MK — HOME / DISCOVER (ENGINE DE DESCOBERTA)
 *
 * Ponto único de social, portfólio, galeria e descoberta do cliente:
 *  - Carrossel horizontal de "Artistas em Destaque" com snap nativo.
 *  - Barra sticky de filtros por estilo em glassmorphism.
 *  - Galeria de inspirações em carrossel horizontal com long-press preview.
 *
 * Zero layout shift: cada card/skeleton trava a proporção (`aspect-[4/5]`,
 * `aspect-square`) para o DOM nascer completo no primeiro frame.
 */

const CAROUSEL_CLASS =
  '-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-4 pb-2 [-webkit-overflow-scrolling:touch] scrollbar-none sm:-mx-6 sm:px-6';

const LONG_PRESS_MS = 420;
const LONG_PRESS_MOVE_TOLERANCE = 10;
const PREVIEW_SPRING = { type: 'spring', stiffness: 380, damping: 28, mass: 0.8 } as const;

const STICKY_FILTER_CLASS =
  'sticky top-0 z-20 -mx-4 border-y border-white/[0.04] bg-neutral-950/55 px-4 py-3 backdrop-blur-xl backdrop-saturate-150 sm:-mx-6 sm:px-6';

type DiscoverArtist = {
  id: string;
  name: string;
  specialty: string;
  avatarUrl: string | null;
  initial: string;
  verified: boolean;
  placeholder?: boolean;
};

const PLACEHOLDER_ARTISTS: DiscoverArtist[] = [
  {
    id: 'ph-marina',
    name: 'Marina Costa',
    specialty: 'Fine Line',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=240&q=80&auto=format&fit=crop',
    initial: 'M',
    verified: true,
    placeholder: true,
  },
  {
    id: 'ph-rafael',
    name: 'Rafael Lima',
    specialty: 'Realismo',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&q=80&auto=format&fit=crop',
    initial: 'R',
    verified: true,
    placeholder: true,
  },
  {
    id: 'ph-bianca',
    name: 'Bianca Souza',
    specialty: 'Blackwork',
    avatarUrl: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=240&q=80&auto=format&fit=crop',
    initial: 'B',
    verified: true,
    placeholder: true,
  },
  {
    id: 'ph-diego',
    name: 'Diego Martins',
    specialty: 'Old School',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&q=80&auto=format&fit=crop',
    initial: 'D',
    verified: false,
    placeholder: true,
  },
  {
    id: 'ph-camila',
    name: 'Camila Rocha',
    specialty: 'Minimalista',
    avatarUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=240&q=80&auto=format&fit=crop',
    initial: 'C',
    verified: true,
    placeholder: true,
  },
  {
    id: 'ph-lucas',
    name: 'Lucas Ferreira',
    specialty: 'Geometrico',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=240&q=80&auto=format&fit=crop',
    initial: 'L',
    verified: false,
    placeholder: true,
  },
];

function SectionHeader({
  icon,
  title,
  action,
  onAction,
}: {
  icon: ReactNode;
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-end justify-between gap-3 px-0.5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 min-h-8 min-w-8 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-400">
          {icon}
        </span>
        <h2 className="text-base font-bold tracking-tight text-white">{title}</h2>
      </div>
      {action ? (
        <button
          type="button"
          onClick={onAction}
          className="apple-press inline-flex min-h-8 items-center gap-1 rounded-lg px-1.5 text-xs font-semibold text-orange-400 hover:text-orange-300"
        >
          {action}
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      ) : null}
    </div>
  );
}

function deriveArtists(items: GaleriaItem[]): DiscoverArtist[] {
  const map = new Map<string, DiscoverArtist & { counts: Map<string, number> }>();
  for (const item of items) {
    const key = item.tatuadorId;
    let entry = map.get(key);
    if (!entry) {
      entry = {
        id: key,
        name: item.artist?.name || '',
        specialty: item.style || '',
        avatarUrl: item.artist?.avatarUrl ?? null,
        initial: item.artist?.initial || (item.artist?.name || 'A').charAt(0).toUpperCase(),
        verified: Boolean(item.artist?.studio),
        counts: new Map<string, number>(),
      };
      map.set(key, entry);
    }
    if (item.style) entry.counts.set(item.style, (entry.counts.get(item.style) ?? 0) + 1);
  }

  return Array.from(map.values())
    .map(({ counts, ...artist }) => {
      let specialty = artist.specialty;
      let best = 0;
      counts.forEach((count, style) => {
        if (count > best) {
          best = count;
          specialty = style;
        }
      });
      return { ...artist, specialty };
    })
    .sort((a, b) => Number(b.verified) - Number(a.verified))
    .slice(0, 12);
}

function ArtistCardSkeleton() {
  return (
    <div className="w-[9rem] shrink-0 snap-start">
      <Skeleton className="h-[9.25rem] w-full rounded-2xl" />
    </div>
  );
}

export function HomeDiscover() {
  const { t } = useI18n();
  const { styleLabel } = portfolioLabelResolver(t);
  const router = useRouter();
  const { triggerHaptic } = useHapticFeedback();
  const { data, isLoading } = useGaleria({ healed: 'all' });

  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [artistPreview, setArtistPreview] = useState<GalleryPreviewItem | null>(null);

  const pressTimer = useRef<number | null>(null);
  const pressOrigin = useRef<{ x: number; y: number } | null>(null);
  const suppressNextClick = useRef(false);

  const cancelLongPress = useCallback(() => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    pressOrigin.current = null;
  }, []);

  useEffect(() => cancelLongPress, [cancelLongPress]);

  const items = useMemo(() => data ?? [], [data]);
  const loading = isLoading && items.length === 0;

  const artists = useMemo<DiscoverArtist[]>(() => {
    const derived = deriveArtists(items);
    return derived.length > 0 ? derived : PLACEHOLDER_ARTISTS;
  }, [items]);

  const styleOptions = useMemo<string[]>(() => {
    const set = new Set<string>();
    for (const item of items) if (item.style) set.add(item.style);
    if (set.size === 0) PORTFOLIO_STYLES.slice(0, 5).forEach((style) => set.add(style));
    return Array.from(set).slice(0, 6);
  }, [items]);

  const inspirations = useMemo<InspirationItem[]>(() => {
    const source: InspirationItem[] =
      items.length > 0
        ? items.map((item) => ({
            id: item.id,
            imageUrl: item.imageUrl,
            style: item.style,
            artistName: item.artist?.name || '',
            artistId: item.tatuadorId,
            likes: item.likesCount,
          }))
        : PLACEHOLDER_INSPIRATIONS;

    const filtered = selectedStyle ? source.filter((item) => item.style === selectedStyle) : source;
    return filtered.slice(0, HOME_GALLERY_TEASER_LIMIT);
  }, [items, selectedStyle]);

  const toArtistPreview = (artist: DiscoverArtist): GalleryPreviewItem => ({
    id: `artist-${artist.id}`,
    imageUrl: artist.avatarUrl || '',
    style: artist.specialty,
    artistName: artist.name,
    artistId: artist.placeholder ? null : artist.id,
    likes: 0,
    kind: 'artist',
    verified: artist.verified,
    initial: artist.initial,
  });

  const startArtistLongPress =
    (artist: DiscoverArtist) => (event: ReactPointerEvent<HTMLElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      cancelLongPress();
      pressOrigin.current = { x: event.clientX, y: event.clientY };
      pressTimer.current = window.setTimeout(() => {
        pressTimer.current = null;
        pressOrigin.current = null;
        suppressNextClick.current = true;
        triggerHaptic('medium');
        setArtistPreview(toArtistPreview(artist));
      }, LONG_PRESS_MS);
    };

  const moveArtistLongPress = (event: ReactPointerEvent<HTMLElement>) => {
    const origin = pressOrigin.current;
    if (!origin) return;
    if (
      Math.hypot(event.clientX - origin.x, event.clientY - origin.y) >
      LONG_PRESS_MOVE_TOLERANCE
    ) {
      cancelLongPress();
    }
  };

  const openArtist = (artist: DiscoverArtist) => {
    if (suppressNextClick.current) {
      suppressNextClick.current = false;
      return;
    }
    triggerHaptic('light');
    if (artist.placeholder) {
      router.push('/dashboard/galeria');
      return;
    }
    router.push(`/profile/${encodeURIComponent(artist.id)}`);
  };

  const openGallery = () => {
    triggerHaptic('light');
    router.push('/dashboard/galeria');
  };

  const dismissArtistPreview = useCallback(() => setArtistPreview(null), []);

  const visitArtistPreview = useCallback(
    (item: GalleryPreviewItem) => {
      setArtistPreview(null);
      triggerHaptic('light');
      router.push(
        item.artistId
          ? `/profile/${encodeURIComponent(item.artistId)}`
          : '/dashboard/galeria'
      );
    },
    [router, triggerHaptic]
  );

  const exploreArtistStyle = useCallback(
    (item: GalleryPreviewItem) => {
      setArtistPreview(null);
      triggerHaptic('light');
      setSelectedStyle(item.style || null);
    },
    [setSelectedStyle, triggerHaptic]
  );

  return (
    <div className="min-w-0 w-full flex-1 space-y-7 pb-4">
      <header className="relative min-w-0 w-full overflow-hidden rounded-3xl border border-zinc-800/50 bg-zinc-900/40 p-5">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-orange-500/20 blur-3xl"
        />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500">
            {BRAND_NAME}
          </p>
          <h1 className="mt-1.5 text-[26px] font-bold leading-tight tracking-tight text-white">
            {t('home.discover')}
          </h1>
          <p className="mt-2 max-w-[34ch] text-sm leading-relaxed text-zinc-400">
            {t('home.discoverSubtitle')}
          </p>
        </div>
      </header>

      <section className="min-w-0 w-full space-y-3" aria-labelledby="discover-artists">
        <SectionHeader
          icon={<Sparkles className="h-4 w-4" strokeWidth={1.9} />}
          title={t('home.featuredArtists')}
          action={t('home.viewAll')}
          onAction={openGallery}
        />
        <div className={CAROUSEL_CLASS} role="list" aria-label={t('home.featuredArtists')}>
          {loading
            ? [0, 1, 2, 3].map((index) => <ArtistCardSkeleton key={index} />)
            : artists.map((artist) => (
                <button
                  key={artist.id}
                  type="button"
                  role="listitem"
                  onClick={() => openArtist(artist)}
                  onPointerDown={startArtistLongPress(artist)}
                  onPointerMove={moveArtistLongPress}
                  onPointerUp={cancelLongPress}
                  onPointerCancel={cancelLongPress}
                  onPointerLeave={cancelLongPress}
                  onContextMenu={(event) => event.preventDefault()}
                  className="group flex w-[9rem] shrink-0 snap-start flex-col items-center gap-2 rounded-2xl border border-zinc-800/50 bg-zinc-900/40 p-3 text-center transition-colors duration-200 hover:border-orange-500/40 active:bg-zinc-900/70"
                >
                  <motion.span
                    layout="position"
                    layoutId={galleryPreviewLayoutId(`artist-${artist.id}`)}
                    transition={PREVIEW_SPRING}
                    style={{ backfaceVisibility: 'hidden' }}
                    className="relative flex h-20 w-20 min-h-20 min-w-20 items-center justify-center rounded-full bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-300 p-[2.5px] transform-gpu will-change-transform [backface-visibility:hidden] [transform:translateZ(0)]"
                  >
                    <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-zinc-950 bg-zinc-900 text-lg font-semibold uppercase text-orange-400">
                      {artist.avatarUrl ? (
                        <OptimizedImage
                          src={artist.avatarUrl}
                          alt={artist.name || t('welcome.artistFallback')}
                          className="h-full w-full rounded-full"
                        />
                      ) : (
                        artist.initial
                      )}
                    </span>
                    {artist.verified ? (
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 min-h-6 min-w-6 items-center justify-center rounded-full border-2 border-zinc-950 bg-orange-500 text-black">
                        <BadgeCheck className="h-3.5 w-3.5" strokeWidth={2.4} />
                      </span>
                    ) : null}
                  </motion.span>
                  <span className="flex w-full flex-col items-center gap-0.5">
                    <span className="w-full truncate text-sm font-semibold tracking-tight text-white">
                      {artist.name || t('welcome.artistFallback')}
                    </span>
                    <span className="w-full truncate text-[11px] font-medium text-zinc-400">
                      {artist.specialty ? styleLabel(artist.specialty) : ''}
                    </span>
                  </span>
                </button>
              ))}
        </div>
      </section>

      <div className={STICKY_FILTER_CLASS}>
        <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-0.5 scrollbar-none">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setSelectedStyle(null);
            }}
            className={cn(
              'shrink-0 rounded-full border px-4 py-2 text-[13px] font-medium backdrop-blur-md transition-all duration-200 active:scale-[0.96]',
              selectedStyle === null
                ? 'border-orange-500/60 bg-orange-500/15 font-semibold text-orange-300 shadow-[0_0_18px_rgba(249,115,22,0.25)]'
                : 'border-white/10 bg-white/[0.04] text-zinc-300 hover:border-orange-500/40 hover:text-orange-300'
            )}
          >
            Tudo
          </button>
          {styleOptions.map((style) => {
            const active = selectedStyle === style;
            return (
              <button
                key={style}
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setSelectedStyle(active ? null : style);
                }}
                className={cn(
                  'shrink-0 rounded-full border px-4 py-2 text-[13px] font-medium backdrop-blur-md transition-all duration-200 active:scale-[0.96]',
                  active
                    ? 'border-orange-500/60 bg-orange-500/15 font-semibold text-orange-300 shadow-[0_0_18px_rgba(249,115,22,0.25)]'
                    : 'border-white/10 bg-white/[0.04] text-zinc-300 hover:border-orange-500/40 hover:text-orange-300'
                )}
              >
                {styleLabel(style)}
              </button>
            );
          })}
        </div>
      </div>

      <section className="min-w-0 w-full space-y-3" aria-labelledby="discover-inspirations">
        <SectionHeader
          icon={<Compass className="h-4 w-4" strokeWidth={1.9} />}
          title={t('gallery.title')}
          action={t('home.viewAll')}
          onAction={openGallery}
        />
        <GalleryInspirationGrid
          items={inspirations}
          loading={loading}
          skeletonCount={HOME_GALLERY_TEASER_LIMIT}
          layout="carousel"
          showLike={false}
          onExploreStyle={(style) => setSelectedStyle(style || null)}
        />
      </section>

      <GalleryHapticPreview
        item={artistPreview}
        onDismiss={dismissArtistPreview}
        onVisitProfile={visitArtistPreview}
        onExploreStyles={exploreArtistStyle}
        showLike={false}
      />
    </div>
  );
}
