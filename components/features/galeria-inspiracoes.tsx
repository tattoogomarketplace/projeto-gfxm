'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Images } from 'lucide-react';
import { GalleryInspirationGrid } from '@/components/features/gallery-inspiration-grid';
import { useGaleria } from '@/hooks/use-galeria';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { PLACEHOLDER_INSPIRATIONS, type InspirationItem } from '@/lib/gallery-mock';
import {
  PORTFOLIO_BODY_PARTS,
  PORTFOLIO_STYLES,
  portfolioLabelResolver,
} from '@/lib/portfolio-metadata';
import type { GaleriaHealingFilter } from '@/lib/types/galeria';
import { cn } from '@/lib/utils';

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

const CHIP_CLASS =
  'shrink-0 rounded-full border px-4 py-2 text-[13px] font-medium backdrop-blur-md transition-all duration-200 active:scale-[0.96]';
const CHIP_ACTIVE =
  'border-orange-500/60 bg-orange-500/15 font-semibold text-orange-300 shadow-[0_0_18px_rgba(249,115,22,0.25)]';
const CHIP_IDLE =
  'border-white/10 bg-white/[0.04] text-zinc-300 hover:border-orange-500/40 hover:text-orange-300';

export function GaleriaInspiracoes({ onStartConversation }: GaleriaInspiracoesProps) {
  void onStartConversation;
  const { t } = useI18n();
  const { triggerHaptic } = useHapticFeedback();
  const { styleLabel, bodyPartLabel } = portfolioLabelResolver(t);
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
      <header className="sticky top-0 z-40 border-b border-white/[0.04] bg-neutral-950/55 px-4 pb-3 pt-[env(safe-area-inset-top)] backdrop-blur-xl backdrop-saturate-150">
        <div className="flex items-center gap-2">
          <Images className="h-5 w-5 shrink-0 text-orange-500" strokeWidth={1.9} aria-hidden />
          <h1 className="truncate text-lg font-bold text-zinc-100 md:text-xl">{t('gallery.title')}</h1>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto overscroll-x-contain pb-0.5 scrollbar-none">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setStyle('');
              setBodyPart('');
              setHealed('all');
            }}
            className={cn(CHIP_CLASS, !style && !bodyPart && healed === 'all' ? CHIP_ACTIVE : CHIP_IDLE)}
          >
            {t('gallery.all')}
          </button>
          {PORTFOLIO_STYLES.map((item) => (
            <button
              key={`style-${item}`}
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setStyle(style === item ? '' : item);
              }}
              className={cn(CHIP_CLASS, style === item ? CHIP_ACTIVE : CHIP_IDLE)}
            >
              {styleLabel(item)}
            </button>
          ))}
          {PORTFOLIO_BODY_PARTS.map((item) => (
            <button
              key={`body-${item}`}
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setBodyPart(bodyPart === item ? '' : item);
              }}
              className={cn(CHIP_CLASS, bodyPart === item ? CHIP_ACTIVE : CHIP_IDLE)}
            >
              {bodyPartLabel(item)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setHealed(healed === 'fresh' ? 'all' : 'fresh');
            }}
            className={cn(CHIP_CLASS, healed === 'fresh' ? CHIP_ACTIVE : CHIP_IDLE)}
          >
            {t('gallery.fresh')}
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setHealed(healed === 'healed' ? 'all' : 'healed');
            }}
            className={cn(CHIP_CLASS, healed === 'healed' ? CHIP_ACTIVE : CHIP_IDLE)}
          >
            {t('gallery.healed')}
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-6 p-4">
        <GalleryInspirationGrid
          items={inspirations}
          loading={loading}
          skeletonCount={4}
          layout="masonry"
          showLike
          onExploreStyle={(nextStyle) => setStyle(nextStyle)}
        />
      </div>
    </div>
  );
}
