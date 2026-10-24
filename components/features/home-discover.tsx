'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { BadgeCheck, ChevronRight, Compass, MapPin, Sparkles, type LucideIcon } from 'lucide-react';
import { GalleryInspirationGrid } from '@/components/features/gallery-inspiration-grid';
import { InspiracoesPeekShelf } from '@/components/features/inspiracoes-peek-shelf';
import {
  GalleryHapticPreview,
  type GalleryPreviewItem,
} from '@/components/features/gallery-haptic-preview';
import { HomeCarouselActionCard } from '@/components/features/home-carousel-action-card';
import { HomeFeedbackCarousel } from '@/components/features/home-feedback-carousel';
import { useGaleria } from '@/hooks/use-galeria';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { useLongPressPreview } from '@/hooks/use-long-press-preview';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { Skeleton } from '@/components/ui/skeleton';
import { BRAND_NAME } from '@/lib/i18n/brands';
import {
  HOME_CAROUSEL_LIMIT,
  PLACEHOLDER_INSPIRATIONS,
  type InspirationItem,
} from '@/lib/gallery-mock';
import { portfolioLabelResolver } from '@/lib/portfolio-metadata';
import { artistProfileHref } from '@/lib/artist-profile';
import type { GaleriaItem } from '@/lib/types/galeria';

/**
 * TATTOOGO MK — HOME / DISCOVER (ENGINE DE DESCOBERTA)
 *
 * Ponto único de social, portfólio, galeria e descoberta do cliente:
 *  - Carrossel horizontal de "Artistas em Destaque" com snap nativo.
 *  - Galeria de inspirações em carrossel horizontal com long-press preview.
 *  - Carrossel de avaliações em destaque com preview háptico sem like/reply.
 *
 * Zero layout shift: cada card/skeleton trava a proporção (`aspect-[4/5]`,
 * `aspect-square`) para o DOM nascer completo no primeiro frame.
 */

const CAROUSEL_CLASS =
  '-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-4 pb-2 [-webkit-overflow-scrolling:touch] scrollbar-none sm:-mx-6 sm:px-6';

const PREVIEW_SPRING = { type: 'spring', stiffness: 380, damping: 28, mass: 0.8 } as const;

type DiscoverArtist = {
  id: string;
  name: string;
  username?: string | null;
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
    username: 'marina_costa',
    specialty: 'Fine Line',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=240&q=80&auto=format&fit=crop',
    initial: 'M',
    verified: true,
    placeholder: true,
  },
  {
    id: 'ph-rafael',
    name: 'Rafael Lima',
    username: 'rafael_lima',
    specialty: 'Realismo',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&q=80&auto=format&fit=crop',
    initial: 'R',
    verified: true,
    placeholder: true,
  },
  {
    id: 'ph-bianca',
    name: 'Bianca Souza',
    username: 'bianca_souza',
    specialty: 'Blackwork',
    avatarUrl: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=240&q=80&auto=format&fit=crop',
    initial: 'B',
    verified: true,
    placeholder: true,
  },
  {
    id: 'ph-diego',
    name: 'Diego Martins',
    username: 'diego_martins',
    specialty: 'Old School',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&q=80&auto=format&fit=crop',
    initial: 'D',
    verified: false,
    placeholder: true,
  },
  {
    id: 'ph-camila',
    name: 'Camila Rocha',
    username: 'camila_rocha',
    specialty: 'Minimalista',
    avatarUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=240&q=80&auto=format&fit=crop',
    initial: 'C',
    verified: true,
    placeholder: true,
  },
  {
    id: 'ph-lucas',
    name: 'Lucas Ferreira',
    username: 'lucas_ferreira',
    specialty: 'Geometrico',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=240&q=80&auto=format&fit=crop',
    initial: 'L',
    verified: false,
    placeholder: true,
  },
];

function SectionHeader({
  id,
  title,
  subtitle,
  icon: Icon,
  href,
  ctaLabel,
}: {
  id: string;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  href?: string;
  ctaLabel?: string;
}) {
  if (href && Icon && ctaLabel) {
    return (
      <div className="mb-4 flex w-full items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-5 w-5 shrink-0 text-orange-500" strokeWidth={1.9} aria-hidden />
          <h2 id={id} className="truncate text-lg font-bold text-zinc-100 md:text-xl">
            {title}
          </h2>
        </div>
        <Link
          href={href}
          className="flex shrink-0 items-center gap-1 text-sm font-bold text-orange-500 transition-colors hover:text-orange-400"
        >
          {ctaLabel}
          <ChevronRight className="h-4 w-4" strokeWidth={2.2} aria-hidden />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-1 px-0.5">
      <h2 id={id} className="text-base font-bold tracking-tight text-white">
        {title}
      </h2>
      {subtitle ? (
        <p className="text-[13px] font-medium leading-snug text-zinc-400">{subtitle}</p>
      ) : null}
    </div>
  );
}

function deriveArtists(items: GaleriaItem[]): DiscoverArtist[] {
  const map = new Map<string, DiscoverArtist & { counts: Map<string, number> }>();
  for (const item of items) {
    const key = item?.tatuadorId;
    if (!key) continue;
    let entry = map.get(key);
    if (!entry) {
      entry = {
        id: key,
        name: item.artist?.name || '',
        username: item.artist?.username ?? null,
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
    .sort((a, b) => Number(b.verified) - Number(a.verified));
}

function ArtistCardSkeleton() {
  return (
    <div className="w-[9rem] shrink-0 snap-start">
      <Skeleton className="h-[9.25rem] w-full rounded-2xl" />
    </div>
  );
}

function artistDestination(artist: DiscoverArtist): string {
  return artistProfileHref(artist);
}

export function HomeDiscover() {
  const { t } = useI18n();
  const { styleLabel } = portfolioLabelResolver(t);
  const router = useRouter();
  const { triggerHaptic } = useHapticFeedback();
  const { data, isLoading } = useGaleria({ healed: 'all' });
  const longPress = useLongPressPreview();

  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [artistPreview, setArtistPreview] = useState<GalleryPreviewItem | null>(null);

  const items = useMemo(() => data ?? [], [data]);
  const loading = isLoading && items.length === 0;

  const artists = useMemo<DiscoverArtist[]>(() => {
    const derived = deriveArtists(items);
    const source = derived.length > 0 ? derived : PLACEHOLDER_ARTISTS;
    return source.slice(0, HOME_CAROUSEL_LIMIT);
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
            artistUsername: item.artist?.username ?? null,
            likes: item.likesCount,
          }))
        : PLACEHOLDER_INSPIRATIONS;

    const filtered = selectedStyle ? source.filter((item) => item.style === selectedStyle) : source;
    return filtered.slice(0, HOME_CAROUSEL_LIMIT);
  }, [items, selectedStyle]);

  const toArtistPreview = (artist: DiscoverArtist): GalleryPreviewItem | null => {
    if (!artist?.id && !artist?.username) return null;
    return {
      id: `artist-${artist.id}`,
      imageUrl: artist.avatarUrl ?? '',
      style: artist.specialty ?? '',
      artistName: artist.name ?? '',
      artistId: artist.id,
      artistUsername: artist.username ?? null,
      likes: 0,
      kind: 'artist',
      verified: Boolean(artist.verified),
      initial: artist.initial || (artist.name || 'A').charAt(0),
    };
  };

  const openArtist = (artist: DiscoverArtist, event?: { preventDefault: () => void; stopPropagation: () => void }) => {
    if (longPress.consumeClick(event)) return;
    triggerHaptic('light');
    router.push(artistDestination(artist));
  };

  const fireArtistPreview = (artist: DiscoverArtist) => {
    const preview = toArtistPreview(artist);
    if (!preview) return;
    triggerHaptic('medium');
    setArtistPreview(preview);
  };

  const dismissArtistPreview = useCallback(() => setArtistPreview(null), []);

  const visitArtistPreview = useCallback(
    (item: GalleryPreviewItem) => {
      setArtistPreview(null);
      triggerHaptic('light');
      router.push(artistProfileHref({ id: item.artistId, username: item.artistUsername }));
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

  const galleryAction = (
    <HomeCarouselActionCard
      href="/dashboard/galeria"
      label={t('home.ctaInspireMore')}
      icon={<Compass className="h-5 w-5" strokeWidth={1.9} />}
      className="h-[15.5rem] w-[11.5rem] rounded-xl"
    />
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
          id="discover-artists"
          title={t('home.featuredArtists')}
          icon={Sparkles}
          href="/dashboard/artistas"
          ctaLabel={t('home.viewAll')}
        />
        <ErrorBoundary
          fallback={
            <div className="flex min-h-[9.25rem] items-center justify-center rounded-2xl border border-zinc-800/50 bg-zinc-900/40 px-4 py-6 text-center">
              <p className="text-sm text-zinc-400">{t('empty.unavailable')}</p>
            </div>
          }
        >
          <div className={CAROUSEL_CLASS} role="list" aria-label={t('home.featuredArtists')}>
            {loading
              ? [0, 1, 2, 3, 4].map((index) => <ArtistCardSkeleton key={index} />)
              : artists.map((artist) => (
                  <button
                    key={artist.id}
                    type="button"
                    role="listitem"
                    onClick={(event) => openArtist(artist, event)}
                    onPointerDown={longPress.start(() => fireArtistPreview(artist))}
                    onPointerMove={longPress.move}
                    onPointerUp={longPress.cancel}
                    onPointerCancel={longPress.cancel}
                    onPointerLeave={longPress.cancel}
                    onContextMenu={(event) => event.preventDefault()}
                    className="group flex h-[9.25rem] w-[9rem] shrink-0 snap-start flex-col items-center gap-2 rounded-2xl border border-zinc-800/50 bg-zinc-900/40 p-3 text-center transition-colors duration-200 hover:border-orange-500/40 active:bg-zinc-900/70"
                  >
                    <motion.span
                      layout="position"
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
                          artist.initial || (artist.name || 'A').charAt(0)
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
            {loading ? null : (
              <HomeCarouselActionCard
                href="/dashboard/artistas"
                label={t('home.ctaMeetMasters')}
                icon={<Sparkles className="h-5 w-5" strokeWidth={1.9} />}
                className="h-[9.25rem] w-[9rem]"
              />
            )}
          </div>
        </ErrorBoundary>
      </section>

      <section className="min-w-0 w-full space-y-3" aria-labelledby="discover-region">
        <SectionHeader
          id="discover-region"
          title={t('home.exploreRegion')}
          subtitle={t('home.exploreRegionSubtitle')}
        />
        <Link
          href="/dashboard/mapa"
          onClick={() => triggerHaptic('light')}
          aria-label={t('home.openInteractiveMap')}
          className="relative block w-full aspect-[21/9] overflow-hidden rounded-3xl border border-zinc-800 active:scale-95 transition-transform md:aspect-video"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_42%,rgba(217,70,14,0.22)_0%,rgba(10,10,10,0.55)_42%,#0a0a0a_78%)]"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(249,115,22,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(249,115,22,0.14)_1px,transparent_1px)] [background-size:28px_28px]"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-zinc-950/20 backdrop-blur-[1px]"
          />
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <span className="relative flex h-16 w-16 items-center justify-center">
              <span className="absolute h-16 w-16 rounded-full border border-orange-500/35 animate-ping" />
              <span className="absolute h-24 w-24 rounded-full border border-orange-500/20 animate-pulse" />
              <span className="relative flex h-12 w-12 min-h-12 min-w-12 items-center justify-center rounded-full border border-orange-500/50 bg-orange-500/15 text-orange-400 shadow-[0_0_24px_rgba(249,115,22,0.35)]">
                <MapPin className="h-6 w-6" strokeWidth={1.9} />
              </span>
            </span>
            <span className="inline-flex min-h-11 items-center rounded-full border border-white/10 bg-black/45 px-4 text-[13px] font-semibold tracking-tight text-white backdrop-blur-md">
              {t('home.openInteractiveMap')}
            </span>
          </span>
        </Link>
      </section>

      <section className="min-w-0 w-full space-y-3" aria-labelledby="discover-inspirations">
        <SectionHeader
          id="discover-inspirations"
          title={t('home.inspirationGallery')}
          icon={Compass}
          href="/dashboard/galeria"
          ctaLabel={t('home.viewAll')}
        />
        <GalleryInspirationGrid
          items={inspirations}
          loading={loading}
          skeletonCount={HOME_CAROUSEL_LIMIT}
          layout="carousel"
          showLike
          onExploreStyle={(style) => setSelectedStyle(style || null)}
          actionCard={galleryAction}
        />
      </section>

      <HomeFeedbackCarousel />

      <InspiracoesPeekShelf />

      <ErrorBoundary fallback={null}>
        <GalleryHapticPreview
          item={artistPreview}
          onDismiss={dismissArtistPreview}
          onVisitProfile={visitArtistPreview}
          onExploreStyles={exploreArtistStyle}
          showLike={false}
        />
      </ErrorBoundary>
    </div>
  );
}
