'use client';

import Link from 'next/link';
import { BadgeCheck, Sparkles } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { useI18n } from '@/hooks/use-i18n';
import { REVIEW_FEATURED_ARTISTS } from '@/lib/review-mock';
import { artistProfileHref } from '@/lib/artist-profile';
import { isEagerGridIndex } from '@/lib/grid-hydration';
import { portfolioLabelResolver } from '@/lib/portfolio-metadata';

const ARTISTS = [
  { ...REVIEW_FEATURED_ARTISTS.marina, specialty: 'Fine Line', verified: true },
  { ...REVIEW_FEATURED_ARTISTS.rafael, specialty: 'Realismo', verified: true },
  { ...REVIEW_FEATURED_ARTISTS.bianca, specialty: 'Blackwork', verified: true },
  { ...REVIEW_FEATURED_ARTISTS.diego, specialty: 'Old School', verified: false },
  { ...REVIEW_FEATURED_ARTISTS.camila, specialty: 'Minimalista', verified: true },
];

export default function ArtistasClient() {
  const { t } = useI18n();
  const { styleLabel } = portfolioLabelResolver(t);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-4 pb-24 pt-4">
      <header className="mb-6 space-y-1">
        <h1 className="text-[22px] font-bold tracking-tight text-white">
          {t('home.featuredArtists')}
        </h1>
        <p className="text-sm text-zinc-400">{t('home.featuredArtistsSubtitle')}</p>
      </header>

      <ul className="grid grid-cols-2 gap-3">
        {ARTISTS.map((artist, index) => (
          <li key={artist.id}>
            <Link
              href={artistProfileHref(artist)}
              className="flex h-full flex-col items-center gap-2 rounded-2xl border border-zinc-800/50 bg-zinc-900/40 p-4 text-center transition-colors hover:border-orange-500/40"
            >
              <span className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-zinc-950 bg-zinc-900">
                <OptimizedImage
                  src={artist.avatarUrl}
                  alt={artist.name}
                  className="h-full w-full rounded-full"
                  sizes="80px"
                  priority={isEagerGridIndex(index)}
                />
                {artist.verified ? (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-zinc-950 bg-orange-500 text-black">
                    <BadgeCheck className="h-3.5 w-3.5" strokeWidth={2.4} />
                  </span>
                ) : null}
              </span>
              <span className="w-full truncate text-sm font-semibold text-white">{artist.name}</span>
              <span className="w-full truncate text-[11px] text-zinc-400">
                {styleLabel(artist.specialty)}
              </span>
            </Link>
          </li>
        ))}
        <li>
          <Link
            href="/dashboard/galeria"
            className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center backdrop-blur-md transition-colors hover:border-orange-500/40"
          >
            <Sparkles className="h-5 w-5 text-orange-300" strokeWidth={1.9} />
            <span className="text-[13px] font-semibold text-white">{t('home.ctaInspireMore')}</span>
          </Link>
        </li>
      </ul>
    </div>
  );
}
