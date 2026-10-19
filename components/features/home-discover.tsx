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
import {
  GalleryHapticPreview,
  galleryPreviewLayoutId,
  type GalleryPreviewItem,
} from '@/components/features/gallery-haptic-preview';
import { useGaleria } from '@/hooks/use-galeria';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { TattooLikeButton } from '@/components/ui/tattoo-like-button';
import { useI18n } from '@/hooks/use-i18n';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { Skeleton } from '@/components/ui/skeleton';
import { BRAND_NAME } from '@/lib/i18n/brands';
import { PORTFOLIO_STYLES, portfolioLabelResolver } from '@/lib/portfolio-metadata';
import { cn } from '@/lib/utils';
import type { GaleriaItem } from '@/lib/types/galeria';

/**
 * TATTOOGO MK — HOME / DISCOVER (ENGINE DE DESCOBERTA)
 *
 * Ponto único de social, portfólio, galeria e descoberta do cliente:
 *  - Carrossel horizontal de "Artistas em Destaque" com snap nativo.
 *  - Barra sticky de filtros por estilo em glassmorphism.
 *  - Galeria de inspirações em masonry (`columns-2`) com overlay e favoritar.
 *
 * Zero layout shift: cada card/skeleton trava a proporção (`aspect-[4/5]`,
 * `aspect-square`) para o DOM nascer completo no primeiro frame.
 */

const CAROUSEL_CLASS =
  '-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-4 pb-2 [-webkit-overflow-scrolling:touch] scrollbar-none sm:-mx-6 sm:px-6';

const STICKY_FILTER_CLASS =
  'sticky top-0 z-20 -mx-4 bg-zinc-950/70 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6';

const ASPECTS = ['aspect-[4/5]', 'aspect-square', 'aspect-[3/4]', 'aspect-[4/5]', 'aspect-square'] as const;

const LONG_PRESS_MS = 420;
const LONG_PRESS_MOVE_TOLERANCE = 10;
const CLICK_SUPPRESSION_MS = 800;

function aspectFor(index: number): string {
  return ASPECTS[index % ASPECTS.length];
}

type DiscoverArtist = {
  id: string;
  name: string;
  specialty: string;
  avatarUrl: string | null;
  initial: string;
  verified: boolean;
  placeholder?: boolean;
};

type InspirationItem = {
  id: string;
  imageUrl: string;
  style: string;
  artistName: string;
  artistId: string | null;
  likes: number;
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

const PLACEHOLDER_INSPIRATIONS: InspirationItem[] = [
  {
    id: 'ph-i1',
    imageUrl: 'https://images.unsplash.com/photo-1565058379802-bbe93b2f703a?w=800&q=80&auto=format&fit=crop',
    style: 'Realismo',
    artistName: 'Rafael Lima',
    artistId: null,
    likes: 428,
  },
  {
    id: 'ph-i2',
    imageUrl: 'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=800&q=80&auto=format&fit=crop',
    style: 'Fine Line',
    artistName: 'Marina Costa',
    artistId: null,
    likes: 312,
  },
  {
    id: 'ph-i3',
    imageUrl: 'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?w=800&q=80&auto=format&fit=crop',
    style: 'Blackwork',
    artistName: 'Bianca Souza',
    artistId: null,
    likes: 587,
  },
  {
    id: 'ph-i4',
    imageUrl: 'https://images.unsplash.com/photo-1542727365-19732a80dcfd?w=800&q=80&auto=format&fit=crop',
    style: 'Old School',
    artistName: 'Diego Martins',
    artistId: null,
    likes: 204,
  },
  {
    id: 'ph-i5',
    imageUrl: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=800&q=80&auto=format&fit=crop',
    style: 'Minimalista',
    artistName: 'Camila Rocha',
    artistId: null,
    likes: 356,
  },
  {
    id: 'ph-i6',
    imageUrl: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&q=80&auto=format&fit=crop',
    style: 'Geometrico',
    artistName: 'Lucas Ferreira',
    artistId: null,
    likes: 271,
  },
  {
    id: 'ph-i7',
    imageUrl: 'https://images.unsplash.com/photo-1560707854-fb9a10eeaace?w=800&q=80&auto=format&fit=crop',
    style: 'Aquarela',
    artistName: 'Marina Costa',
    artistId: null,
    likes: 193,
  },
  {
    id: 'ph-i8',
    imageUrl: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&q=80&auto=format&fit=crop',
    style: 'Lettering',
    artistName: 'Diego Martins',
    artistId: null,
    likes: 462,
  },
  {
    id: 'ph-i9',
    imageUrl: 'https://images.unsplash.com/photo-1595475207225-428b62bda831?w=800&q=80&auto=format&fit=crop',
    style: 'Oriental',
    artistName: 'Bianca Souza',
    artistId: null,
    likes: 638,
  },
  {
    id: 'ph-i10',
    imageUrl: 'https://images.unsplash.com/photo-1562962230-16e4623d36e6?w=800&q=80&auto=format&fit=crop',
    style: 'Realismo',
    artistName: 'Rafael Lima',
    artistId: null,
    likes: 349,
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
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [preview, setPreview] = useState<GalleryPreviewItem | null>(null);

  const pressTimer = useRef<number | null>(null);
  const pressOrigin = useRef<{ x: number; y: number } | null>(null);
  const suppressClickUntil = useRef(0);

  const cancelLongPress = useCallback(() => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    pressOrigin.current = null;
  }, []);

  useEffect(() => cancelLongPress, [cancelLongPress]);

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

  const consumeLongPressClick = useCallback(() => {
    if (Date.now() < suppressClickUntil.current) {
      suppressClickUntil.current = 0;
      return true;
    }
    return false;
  }, []);

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

    return selectedStyle ? source.filter((item) => item.style === selectedStyle) : source;
  }, [items, selectedStyle]);

  const openArtist = (artist: DiscoverArtist) => {
    triggerHaptic('light');
    if (artist.placeholder) {
      router.push('/dashboard/galeria');
      return;
    }
    router.push(`/profile/${encodeURIComponent(artist.id)}`);
  };

  const openInspiration = (item: InspirationItem) => {
    triggerHaptic('light');
    router.push(item.artistId ? `/profile/${encodeURIComponent(item.artistId)}` : '/dashboard/galeria');
  };

  const openGallery = () => {
    triggerHaptic('light');
    router.push('/dashboard/galeria');
  };

  const toggleSaved = (id: string) => {
    setSaved((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleInspirationClick = (item: InspirationItem) => {
    if (consumeLongPressClick()) return;
    openInspiration(item);
  };

  const dismissPreview = useCallback(() => setPreview(null), []);

  const visitPreviewProfile = useCallback(
    (item: GalleryPreviewItem) => {
      setPreview(null);
      triggerHaptic('light');
      router.push(
        item.artistId
          ? `/profile/${encodeURIComponent(item.artistId)}`
          : '/dashboard/galeria'
      );
    },
    [router, triggerHaptic]
  );

  const explorePreviewStyles = useCallback(
    (item: GalleryPreviewItem) => {
      setPreview(null);
      triggerHaptic('light');
      setSelectedStyle(item.style || null);
    },
    [triggerHaptic]
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
                  className="group flex w-[9rem] shrink-0 snap-start flex-col items-center gap-2 rounded-2xl border border-zinc-800/50 bg-zinc-900/40 p-3 text-center transition-colors duration-200 hover:border-orange-500/40 active:bg-zinc-900/70"
                >
                  <span className="relative flex h-20 w-20 min-h-20 min-w-20 items-center justify-center rounded-full bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-300 p-[2.5px]">
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
                  </span>
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
              'shrink-0 rounded-full border px-4 py-2 text-[13px] font-medium transition-all duration-200 active:scale-[0.96]',
              selectedStyle === null
                ? 'border-orange-500/50 bg-orange-500 font-semibold text-black shadow-[0_0_18px_rgba(249,115,22,0.3)]'
                : 'border-zinc-800/50 bg-zinc-900/60 text-zinc-300 backdrop-blur-md hover:border-orange-500/40 hover:text-orange-300'
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
                  'shrink-0 rounded-full border px-4 py-2 text-[13px] font-medium transition-all duration-200 active:scale-[0.96]',
                  active
                    ? 'border-orange-500/50 bg-orange-500 font-semibold text-black shadow-[0_0_18px_rgba(249,115,22,0.3)]'
                    : 'border-zinc-800/50 bg-zinc-900/60 text-zinc-300 backdrop-blur-md hover:border-orange-500/40 hover:text-orange-300'
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
        {loading ? (
          <div className="columns-2 gap-4" aria-hidden>
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <Skeleton
                key={index}
                className={cn('mb-4 w-full break-inside-avoid rounded-xl', aspectFor(index))}
              />
            ))}
          </div>
        ) : inspirations.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-800/50 px-4 py-8 text-center text-sm text-zinc-500">
            {t('gallery.empty')}
          </p>
        ) : (
          <div className="columns-2 gap-4">
            {inspirations.map((item, index) => {
              const isSaved = Boolean(saved[item.id]);
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
                    'group relative mb-4 select-none break-inside-avoid overflow-hidden rounded-xl border border-zinc-800/50 bg-zinc-900/40',
                    aspectFor(index)
                  )}
                >
                  <motion.div
                    layoutId={galleryPreviewLayoutId(item.id)}
                    transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                    className="absolute inset-0"
                  >
                    <OptimizedImage
                      src={item.imageUrl}
                      alt={`${styleLabel(item.style)} — ${item.artistName || t('welcome.artistFallback')}`}
                      className="h-full w-full transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  </motion.div>
                  <button
                    type="button"
                    onClick={() => handleInspirationClick(item)}
                    className="absolute inset-0 z-[1]"
                    aria-label={item.artistName || t('welcome.artistFallback')}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 z-[2] flex items-end justify-between gap-2 p-3">
                    <div className="pointer-events-none min-w-0">
                      <p className="truncate text-[13px] font-semibold text-white">
                        {item.artistName || t('welcome.artistFallback')}
                      </p>
                      <p className="truncate text-[11px] text-zinc-300/90">
                        {styleLabel(item.style)}
                      </p>
                    </div>
                    <TattooLikeButton
                      liked={isSaved}
                      onToggle={() => toggleSaved(item.id)}
                      showCount={false}
                      dataGalleryAction
                      ariaLabel={isSaved ? t('aria.unlike') : t('aria.like')}
                      className="pointer-events-auto h-9 w-9 min-h-9 min-w-9 border border-white/15 bg-black/50 p-0 text-white backdrop-blur-md"
                      iconClassName="h-[17px] w-[17px]"
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <GalleryHapticPreview
        item={preview}
        onDismiss={dismissPreview}
        onVisitProfile={visitPreviewProfile}
        onExploreStyles={explorePreviewStyles}
      />
    </div>
  );
}
