'use client';

import { useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Flame, MapPin, Sparkles, Star } from 'lucide-react';
import { useGaleria } from '@/hooks/use-galeria';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { GaleriaEntryCard } from '@/components/features/galeria-inspiracoes';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { Skeleton } from '@/components/ui/skeleton';
import { BRAND_NAME } from '@/lib/i18n/brands';
import { portfolioLabelResolver } from '@/lib/portfolio-metadata';
import { cn } from '@/lib/utils';
import type { GaleriaItem } from '@/lib/types/galeria';

/**
 * Premium "Discover" home for the client dashboard.
 *
 * Reads the verified inspiration feed and reshapes it into two
 * horizontally scrolling carousels (featured artists + trending styles).
 * Pure presentational layer: no data mutation, no routing logic changes —
 * taps reuse the existing artist route (`/dashboard/artista/[id]`).
 */

/**
 * Native-feeling horizontal scroller: hidden scrollbar, mandatory snapping,
 * momentum preserved on iOS. Declared once to keep the JSX readable.
 */
const CAROUSEL_CLASS =
  '-mx-4 flex min-w-0 w-full snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-4 pb-4 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden';

const TAP_SCALE = 'apple-press';

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
        <span className="flex h-8 w-8 min-h-8 min-w-8 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-500 shadow-[0_0_16px_rgba(249,115,22,0.18)] dark:text-orange-400">
          {icon}
        </span>
        <h2 className="text-base font-bold tracking-tight text-gray-900 dark:text-white">
          {title}
        </h2>
      </div>
      {action ? (
        <button
          type="button"
          onClick={onAction}
          className="apple-press inline-flex min-h-8 items-center gap-1 rounded-lg px-1.5 text-xs font-semibold text-orange-600 hover:text-orange-500 dark:text-orange-400"
        >
          {action}
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      ) : null}
    </div>
  );
}

type FeaturedArtist = {
  id: string;
  name: string;
  avatarUrl: string | null;
  initial: string;
  location: string | null;
  works: number;
  cover: string;
};

function deriveFeaturedArtists(items: GaleriaItem[]): FeaturedArtist[] {
  const map = new Map<string, FeaturedArtist>();
  for (const item of items) {
    const id = item.tatuadorId;
    const existing = map.get(id);
    if (existing) {
      existing.works += 1;
      if (!existing.cover && item.imageUrl) existing.cover = item.imageUrl;
      continue;
    }
    map.set(id, {
      id,
      name: item.artist?.name || BRAND_NAME,
      avatarUrl: item.artist?.avatarUrl ?? null,
      initial: item.artist?.initial || (item.artist?.name || 'A').charAt(0).toUpperCase(),
      location:
        item.artist?.cidade && item.artist?.estado
          ? `${item.artist.cidade}/${item.artist.estado}`
          : item.artist?.cidade || null,
      works: 1,
      cover: item.imageUrl,
    });
  }
  return Array.from(map.values())
    .sort((a, b) => b.works - a.works)
    .slice(0, 8);
}

function deriveTrendingStyles(items: GaleriaItem[]): { style: string; count: number }[] {
  const map = new Map<string, number>();
  for (const item of items) {
    if (!item.style) continue;
    map.set(item.style, (map.get(item.style) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([style, count]) => ({ style, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

const STYLE_GRADIENTS = [
  'from-neutral-700 via-neutral-800 to-neutral-950',
  'from-emerald-600/40 via-neutral-800 to-neutral-950',
  'from-orange-500/40 via-neutral-800 to-neutral-950',
  'from-neutral-600/70 via-neutral-800 to-neutral-950',
  'from-emerald-500/30 via-neutral-700 to-neutral-950',
];

function styleGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return STYLE_GRADIENTS[hash % STYLE_GRADIENTS.length];
}

function ArtistCardSkeleton() {
  return (
    <div className="w-64 shrink-0 snap-start space-y-3">
      <Skeleton className="h-44 w-full rounded-2xl" />
      <Skeleton className="h-3 w-32 rounded-full" />
      <Skeleton className="h-3 w-20 rounded-full" />
    </div>
  );
}

function StyleCardSkeleton() {
  return (
    <div className="w-36 shrink-0 snap-start">
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}

export function HomeDiscover() {
  const { t } = useI18n();
  const { styleLabel } = portfolioLabelResolver(t);
  const router = useRouter();
  const { triggerHaptic } = useHapticFeedback();
  const { data, isLoading } = useGaleria({ healed: 'all' });

  const items = useMemo(() => data ?? [], [data]);
  const artists = useMemo(() => deriveFeaturedArtists(items), [items]);
  const styles = useMemo(() => deriveTrendingStyles(items), [items]);

  const openArtist = (id: string) => {
    triggerHaptic('light');
    router.push(`/dashboard/artista/${encodeURIComponent(id)}`);
  };

  const openGallery = () => {
    triggerHaptic('light');
    router.push('/dashboard/galeria');
  };

  return (
    <div className="min-w-0 w-full flex-1 space-y-7">
      <header className="relative min-w-0 w-full overflow-hidden rounded-3xl border border-black/[0.04] bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.04)] backdrop-blur-md dark:border-white/[0.05] dark:bg-white/[0.03] dark:shadow-none">
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500 dark:text-orange-400">
            {BRAND_NAME}
          </p>
          <h1 className="mt-1.5 text-[26px] font-bold leading-tight tracking-tight text-gray-900 dark:text-white">
            {t('home.discover')}
          </h1>
          <p className="mt-2 max-w-[34ch] text-sm leading-relaxed text-neutral-600 dark:text-zinc-400">
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
        {isLoading ? (
          <div className={CAROUSEL_CLASS} aria-hidden>
            <ArtistCardSkeleton />
            <ArtistCardSkeleton />
            <ArtistCardSkeleton />
          </div>
        ) : artists.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500 dark:border-white/[0.05] dark:text-zinc-400">
            {t('home.noFeaturedArtists')}
          </p>
        ) : (
          <div className={CAROUSEL_CLASS} role="list" aria-label={t('home.featuredArtists')}>
            {artists.map((artist) => (
              <button
                key={artist.id}
                type="button"
                role="listitem"
                onClick={() => openArtist(artist.id)}
                className={cn(
                  TAP_SCALE,
                  'group relative w-64 shrink-0 snap-start overflow-hidden rounded-2xl border border-black/[0.04] bg-white text-left shadow-[0_2px_10px_rgba(0,0,0,0.04)]',
                  'dark:border-white/[0.05] dark:bg-white/[0.03] dark:shadow-none'
                )}
              >
                <div className="relative h-44 w-full overflow-hidden">
                  <OptimizedImage
                    src={artist.cover}
                    alt={artist.name}
                    className="h-44 w-full"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-md">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" strokeWidth={1.5} />
                    {artist.works}
                  </span>
                  <div className="absolute inset-x-3 bottom-3 flex items-center gap-2.5">
                    <span className="flex h-9 w-9 min-h-9 min-w-9 items-center justify-center overflow-hidden rounded-full border border-white/40 bg-neutral-900 text-sm font-semibold uppercase text-orange-400">
                      {artist.avatarUrl ? (
                        <OptimizedImage
                          src={artist.avatarUrl}
                          alt={artist.name}
                          className="h-9 w-9 overflow-hidden rounded-full"
                        />
                      ) : (
                        artist.initial
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{artist.name}</p>
                      {artist.location ? (
                        <p className="flex items-center gap-1 truncate text-[11px] text-white/70">
                          <MapPin className="h-3 w-3" strokeWidth={1.75} />
                          {artist.location}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="min-w-0 w-full space-y-3" aria-labelledby="discover-styles">
        <SectionHeader
          icon={<Flame className="h-4 w-4" strokeWidth={1.9} />}
          title={t('home.trendingStyles')}
          action={t('home.viewAll')}
          onAction={openGallery}
        />
        {isLoading ? (
          <div className={CAROUSEL_CLASS} aria-hidden>
            <StyleCardSkeleton />
            <StyleCardSkeleton />
            <StyleCardSkeleton />
            <StyleCardSkeleton />
          </div>
        ) : styles.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500 dark:border-white/[0.05] dark:text-zinc-400">
            {t('home.noTrendingStyles')}
          </p>
        ) : (
          <div className={CAROUSEL_CLASS} role="list" aria-label={t('home.trendingStyles')}>
            {styles.map((entry) => (
              <button
                key={entry.style}
                type="button"
                role="listitem"
                onClick={openGallery}
                className={cn(
                  TAP_SCALE,
                  'relative w-36 shrink-0 snap-start overflow-hidden rounded-2xl border border-black/[0.04] bg-white text-left shadow-[0_2px_10px_rgba(0,0,0,0.04)] dark:border-white/[0.05] dark:bg-white/[0.03] dark:shadow-none'
                )}
              >
                <div
                  className={cn(
                    'relative flex h-40 w-full flex-col justify-end bg-gradient-to-br p-3',
                    styleGradient(entry.style)
                  )}
                >
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_20%_0%,rgba(255,255,255,0.35),transparent_60%)]"
                  />
                  <div className="relative">
                    <p className="text-sm font-bold leading-tight text-white drop-shadow">
                      {styleLabel(entry.style)}
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium text-white/80">
                      {entry.count}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <GaleriaEntryCard href="/dashboard/galeria" />
    </div>
  );
}
