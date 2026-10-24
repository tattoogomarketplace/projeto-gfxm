'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Compass, Images } from 'lucide-react';
import { GalleryInspirationGrid } from '@/components/features/gallery-inspiration-grid';
import { PortfolioFilterBar } from '@/components/features/portfolio-filter-bar';
import { useI18n } from '@/hooks/use-i18n';
import type { InspirationItem } from '@/lib/gallery-mock';
import type { GaleriaHealingFilter } from '@/lib/types/galeria';

type GaleriaInspiracoesProps = {
  onStartConversation: (tatuadorId: string, artworkId: string) => void;
  items?: InspirationItem[];
  savedIds?: string[];
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

export function GaleriaInspiracoes({
  onStartConversation,
  items = [],
  savedIds = [],
}: GaleriaInspiracoesProps) {
  const { t } = useI18n();
  const [style, setStyle] = useState<string>('');
  const [bodyPart, setBodyPart] = useState<string>('');
  const [healed, setHealed] = useState<GaleriaHealingFilter>('all');

  const loading = false;
  const inspirations = useMemo<InspirationItem[]>(() => {
    return style ? items.filter((item) => item.style === style) : items;
  }, [items, style]);

  return (
    <div className="relative z-0 isolate flex w-full max-w-none flex-col px-0 mx-0 text-white">
      <div className="px-4 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/5 border-l-2 border-l-[#F97316] bg-[#121212]/60 p-3 backdrop-blur-sm">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-orange-500/10 p-1.5 text-orange-500">
            <Compass className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <h1 className="text-base font-semibold tracking-tight text-zinc-100">{t('gallery.title')}</h1>
        </div>
      </div>
      <div className="sticky top-0 z-20 flex gap-2 bg-transparent px-4 pb-2 pt-[max(env(safe-area-inset-top),0.5rem)] pointer-events-none">
        <PortfolioFilterBar
          style={style}
          bodyPart={bodyPart}
          healed={healed}
          onStyleChange={setStyle}
          onBodyPartChange={setBodyPart}
          onHealingChange={setHealed}
        />
      </div>

      <div className="flex w-full max-w-none flex-col px-0 mx-0">
        <GalleryInspirationGrid
          items={inspirations}
          loading={loading}
          skeletonCount={9}
          showLike
          savedIds={savedIds}
          onExploreStyle={(nextStyle) => setStyle(nextStyle)}
          onStartConversation={onStartConversation}
        />
      </div>
    </div>
  );
}
