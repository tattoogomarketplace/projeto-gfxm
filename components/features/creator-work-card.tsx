'use client';

import { Archive, Eye, Pencil } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { portfolioLabelResolver, type PortfolioItemDto } from '@/lib/portfolio-metadata';
import { cn } from '@/lib/utils';

export function deriveWorkViews(item: Pick<PortfolioItemDto, 'id' | 'likesCount'>): number {
  let hash = 0;
  for (let i = 0; i < item.id.length; i += 1) {
    hash = (hash * 31 + item.id.charCodeAt(i)) >>> 0;
  }
  return item.likesCount * 7 + (hash % 53) + 12;
}

export function CreatorWorkCard({
  item,
  onEdit,
  onArchive,
  busy,
}: {
  item: PortfolioItemDto;
  onEdit: (item: PortfolioItemDto) => void;
  onArchive: (item: PortfolioItemDto) => void;
  busy?: boolean;
}) {
  const { t } = useI18n();
  const { triggerHaptic } = useHapticFeedback();
  const { styleLabel, healingLabel } = portfolioLabelResolver(t);
  const views = deriveWorkViews(item);

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] dark:border-white/[0.05] dark:bg-white/[0.03] dark:shadow-none">
      <div className="relative h-56 w-full overflow-hidden">
        <OptimizedImage src={item.imageUrl} alt={styleLabel(item.style)} className="h-full w-full" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-md">
          <Eye className="h-3 w-3 text-orange-400" strokeWidth={2} />
          {views.toLocaleString()} {t('creator.viewsUnit')}
        </span>
        <span
          className={cn(
            'absolute right-3 top-3 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide backdrop-blur-md',
            item.isHealed
              ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
              : 'border-orange-500/40 bg-orange-500/15 text-orange-200'
          )}
        >
          {healingLabel(item.isHealed)}
        </span>
        <p className="absolute inset-x-3 bottom-3 truncate text-sm font-semibold text-white">
          {styleLabel(item.style)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            triggerHaptic('light');
            onEdit(item);
          }}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-black/[0.04] bg-white/[0.04] text-xs font-semibold text-neutral-700 transition-all active:scale-[0.97] disabled:opacity-40 dark:border-white/[0.05] dark:text-zinc-200"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={1.9} />
          {t('common.edit')}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            triggerHaptic('medium');
            onArchive(item);
          }}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-orange-500/30 bg-orange-500/10 text-xs font-semibold text-orange-600 transition-all active:scale-[0.97] disabled:opacity-40 dark:text-orange-300"
        >
          <Archive className="h-3.5 w-3.5" strokeWidth={1.9} />
          {t('creator.archive')}
        </button>
      </div>
    </article>
  );
}
