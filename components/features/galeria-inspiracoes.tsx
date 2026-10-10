'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Images, Sparkles } from 'lucide-react';
import { GaleriaCard } from '@/components/features/galeria-card';
import { PortfolioFilterBar } from '@/components/features/portfolio-filter-bar';
import { GlassContainer } from '@/components/ui/glass-container';
import { Skeleton } from '@/components/ui/skeleton';
import { useGaleria } from '@/hooks/use-galeria';
import { useI18n } from '@/hooks/use-i18n';
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

export function GaleriaInspiracoes({ onStartConversation }: GaleriaInspiracoesProps) {
  const [style, setStyle] = useState<string>('');
  const [bodyPart, setBodyPart] = useState<string>('');
  const [healed, setHealed] = useState<GaleriaHealingFilter>('all');
  const { t } = useI18n();

  const query = useMemo(
    () => ({
      style: style || undefined,
      bodyPart: bodyPart || undefined,
      healed,
    }),
    [style, bodyPart, healed]
  );

  const { data, isLoading, isFetching, isError } = useGaleria(query);
  const items = data ?? [];
  const hasFilters = Boolean(style || bodyPart || healed !== 'all');

  return (
    <div className="space-y-4">
      <div className={ENTRY_CARD_CLASS}>
        <span className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-400">
          <Images className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold tracking-tight text-neutral-900 dark:text-white">
            {t('gallery.title')}
          </span>
          <span className="mt-0.5 block text-xs text-zinc-500">
            {t('gallery.subtitle')}
          </span>
        </span>
      </div>

      <PortfolioFilterBar
        style={style}
        bodyPart={bodyPart}
        healed={healed}
        onStyleChange={setStyle}
        onBodyPartChange={setBodyPart}
        onHealingChange={setHealed}
      />

      {isLoading ? (
        <div className="columns-1 gap-4 sm:columns-2">
          <Skeleton className="mb-4 h-80 w-full break-inside-avoid rounded-2xl" />
          <Skeleton className="mb-4 h-64 w-full break-inside-avoid rounded-2xl" />
          <Skeleton className="mb-4 h-72 w-full break-inside-avoid rounded-2xl" />
          <Skeleton className="mb-4 h-56 w-full break-inside-avoid rounded-2xl" />
        </div>
      ) : isError ? (
        <GlassContainer className="border-dashed p-6 text-center">
          <p className="text-sm text-neutral-500 dark:text-zinc-400">{t('gallery.loadError')}</p>
          <p className="mt-1 text-xs text-neutral-500 dark:text-zinc-500">{t('gallery.loadErrorHint')}</p>
        </GlassContainer>
      ) : items.length === 0 ? (
        <GlassContainer className="border-dashed p-6 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-orange-500 dark:text-orange-400" strokeWidth={1.75} />
          <p className="mt-3 text-sm text-neutral-500 dark:text-zinc-400">
            {hasFilters ? t('gallery.emptyFiltered') : t('gallery.empty')}
          </p>
          <p className="mt-1 text-xs text-neutral-500 dark:text-zinc-500">
            {hasFilters ? t('gallery.emptyFilteredHint') : t('gallery.emptyHint')}
          </p>
        </GlassContainer>
      ) : (
        <div
          className={cn(
            'columns-1 gap-4 sm:columns-2',
            isFetching && 'opacity-80 transition-opacity duration-300'
          )}
        >
          {items.map((item) => (
            <div key={item.id} className="mb-4 break-inside-avoid">
              <GaleriaCard item={item} onStartConversation={onStartConversation} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
