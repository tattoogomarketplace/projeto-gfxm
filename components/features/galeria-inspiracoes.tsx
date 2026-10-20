'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Images } from 'lucide-react';
import { GalleryInspirationGrid } from '@/components/features/gallery-inspiration-grid';
import { PortfolioFilterBar } from '@/components/features/portfolio-filter-bar';
import { useGaleria } from '@/hooks/use-galeria';
import { useI18n } from '@/hooks/use-i18n';
import { PLACEHOLDER_INSPIRATIONS, type InspirationItem } from '@/lib/gallery-mock';
import type { GaleriaHealingFilter } from '@/lib/types/galeria';

type GaleriaInspiracoesProps = {
  onStartConversation: (tatuadorId: string, artworkId: string) => void;
};

const ENTRY_CARD_CLASS =
  'group flex min-h-11 w-full items-center gap-3 rounded-2xl border border-black/[0.04] bg-white px-4 py-3 text-left shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-all hover:border-orange-500/40 hover:bg-orange-500/[0.04] active:scale-[0.99] dark:border-white/[0.05] dark:bg-white/[0.03] dark:shadow-none';

export function GaleriaEntryCard({ href = '/dashboard/galeria' }: { href?: string }) {
  const { t } = useI18n();
  return (
    <Link href={href} className={ENTRY_CARD_CLASS}>
      <span className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-400">
        <Images className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold tracking-tight text-neutral-900 dark:text-white">
          {t('gallery.title')}
        </span>
        <span className="mt-0.5 block text-xs text-zinc-500">
          {t('gallery.explore')}
        </span>
      </span>
      <ChevronRight
        className="h-5 w-5 min-h-5 min-w-5 text-zinc-500 transition-colors group-hover:text-orange-400"
        strokeWidth={1.75}
      />
    </Link>
  );
}

export function GaleriaInspiracoes({ onStartConversation }: GaleriaInspiracoesProps) {
  void onStartConversation;
  const { t } = useI18n();
  const [style, setStyle] = useState<string>('');
  const [bodyPart, setBodyPart] = useState<string>('');
  const [healed, setHealed] = useState<GaleriaHealingFilter>('all');

  const query = useMemo(
    () => ({
      style: style || undefined,
      bodyPart: bodyPart || undefined,
      healed,
    }),
    [style, bodyPart, healed]
  );

  const { data, isLoading } = useGaleria(query);
  const liveItems = useMemo(() => data ?? [], [data]);
  const loading = isLoading && liveItems.length === 0;

  const inspirations = useMemo<InspirationItem[]>(() => {
    const source: InspirationItem[] =
      liveItems.length > 0
        ? liveItems.map((item) => ({
            id: item.id,
            imageUrl: item.imageUrl,
            style: item.style,
            artistName: item.artist?.name || '',
            artistId: item.tatuadorId,
            artistUsername: item.artist?.username ?? null,
            likes: item.likesCount,
            artistAvatarUrl: item.artist?.avatarUrl ?? null,
            artistInitial: item.artist?.initial,
          }))
        : PLACEHOLDER_INSPIRATIONS;

    return style ? source.filter((item) => item.style === style) : source;
  }, [liveItems, style]);

  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-none bg-zinc-950 pb-[calc(env(safe-area-inset-bottom)+7rem)] text-white [-webkit-overflow-scrolling:touch]">
      <header className="sticky top-0 z-40 border-b border-zinc-900 bg-zinc-950/90 px-6 pb-2 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <h1 className="text-2xl font-bold text-zinc-100">{t('gallery.title')}</h1>
        <p className="mt-1 text-sm text-zinc-400">{t('gallery.subtitle')}</p>
        <div className="mt-4">
          <PortfolioFilterBar
            style={style}
            bodyPart={bodyPart}
            healed={healed}
            onStyleChange={setStyle}
            onBodyPartChange={setBodyPart}
            onHealingChange={setHealed}
          />
        </div>
      </header>

      <div className="w-full">
        <GalleryInspirationGrid
          items={inspirations}
          loading={loading}
          skeletonCount={4}
          layout="feed"
          showLike
          onExploreStyle={(nextStyle) => setStyle(nextStyle)}
        />
      </div>
    </div>
  );
}
