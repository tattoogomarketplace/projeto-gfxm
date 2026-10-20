'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';

export default function ArtistProfileNotFound() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-4 px-6 pb-24 text-center">
      <h1 className="text-xl font-bold tracking-tight text-white">{t('home.noFeaturedArtists')}</h1>
      <p className="max-w-[32ch] text-sm leading-relaxed text-zinc-400">
        {t('home.featuredArtistsSubtitle')}
      </p>
      <Link
        href="/dashboard/artistas"
        className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl border border-orange-500/40 bg-orange-500/15 px-4 text-sm font-semibold text-orange-300"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.9} />
        {t('common.back')}
      </Link>
    </div>
  );
}
