'use client';

import { useMemo, useOptimistic, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Aperture,
  Bookmark,
  Droplets,
  Flower2,
  Hexagon,
  LayoutGrid,
  Minus,
  Palette,
  PenLine,
  Sparkles,
  Type,
  Anchor,
  type LucideIcon,
} from 'lucide-react';
import { NATIVE_APP_IMAGE_STYLE, OptimizedImage } from '@/components/ui/optimized-image';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { toggleSave } from '@/actions/saved-actions';
import { artistProfileHref } from '@/lib/artist-profile';
import type { InspirationItem } from '@/lib/gallery-mock';
import { isEagerGridIndex } from '@/lib/grid-hydration';
import { PORTFOLIO_STYLES, portfolioLabelResolver } from '@/lib/portfolio-metadata';
import { cn } from '@/lib/utils';

const STYLE_ICONS: Record<string, LucideIcon> = {
  'Fine Line': PenLine,
  Realismo: Aperture,
  'Old School': Anchor,
  Blackwork: Droplets,
  Minimalista: Minus,
  Oriental: Flower2,
  Geometrico: Hexagon,
  Aquarela: Palette,
  Lettering: Type,
  'Neo Traditional': Sparkles,
};

const FILTER_CHIP_BASE =
  'relative flex min-h-11 shrink-0 snap-start items-center gap-2 overflow-hidden rounded-2xl border px-3.5 py-2 text-left shadow-inner backdrop-blur-md transition-transform duration-200 active:scale-[0.97] transform-gpu will-change-transform [backface-visibility:hidden] [transform:translateZ(0)]';

const FILTER_ROW_CLASS =
  'flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch] scrollbar-none scrollbar-hide hide-scrollbar transform-gpu will-change-transform';

export function SavedInspirationsGallery({ items = [] }: { items?: InspirationItem[] }) {
  const { t } = useI18n();
  const { styleLabel } = portfolioLabelResolver(t);
  const router = useRouter();
  const { triggerHaptic } = useHapticFeedback();
  const [style, setStyle] = useState('');
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const savedItems = useMemo(
    () => items.filter((item) => !removedIds.includes(item.id)),
    [items, removedIds]
  );
  const [optimisticItems, removeOptimistic] = useOptimistic(
    savedItems,
    (current, postId: string) => current.filter((item) => item.id !== postId)
  );
  const [, startTransition] = useTransition();

  const visibleItems = useMemo(() => {
    if (!style) return optimisticItems;
    return optimisticItems.filter((item) => item.style === style);
  }, [optimisticItems, style]);

  const handleUnsave = (item: InspirationItem, event: { stopPropagation: () => void }) => {
    event.stopPropagation();
    triggerHaptic('light');
    startTransition(async () => {
      removeOptimistic(item.id);
      const result = await toggleSave(item.id);
      if (!result.success) return;
      setRemovedIds((prev) => {
        if (result.isSaved) return prev.filter((id) => id !== item.id);
        return prev.includes(item.id) ? prev : [...prev, item.id];
      });
    });
  };

  const filters = useMemo(
    () => [{ value: '', label: t('gallery.all'), icon: LayoutGrid }, ...PORTFOLIO_STYLES.map((value) => ({
      value,
      label: styleLabel(value),
      icon: STYLE_ICONS[value] ?? Sparkles,
    }))],
    [styleLabel, t]
  );

  return (
    <div className="relative z-0 isolate flex w-full max-w-none flex-col overscroll-none bg-[#121212] text-white">
      <header className="px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/10 border-l-2 border-l-[#F97316] bg-[#121212]/70 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md">
          <span className="flex h-9 w-9 min-h-9 min-w-9 items-center justify-center rounded-xl border border-orange-500/35 bg-orange-500/15 text-orange-400 shadow-[0_0_18px_rgba(249,115,22,0.28)]">
            <Bookmark className="h-4 w-4" strokeWidth={1.9} fill="currentColor" aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight text-zinc-100 md:text-xl">
              {t('home.inspiracoes')}
            </h1>
            <p className="truncate text-[12px] font-medium text-zinc-400">
              {t('profile.tabSaved')}
            </p>
          </div>
        </div>
      </header>

      <div className="sticky top-0 z-20 bg-[#121212]/80 px-4 pb-3 pt-1 backdrop-blur-md">
        <div className={FILTER_ROW_CLASS} role="listbox" aria-label={t('gallery.style')}>
          {filters.map((filter) => {
            const active = style === filter.value;
            const Icon = filter.icon;
            return (
              <button
                key={filter.value || 'all'}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  triggerHaptic('light');
                  setStyle(filter.value);
                }}
                className={cn(
                  FILTER_CHIP_BASE,
                  active
                    ? 'border-orange-500/50 bg-gradient-to-br from-orange-500/30 via-amber-500/10 to-white/5 text-orange-200 shadow-[0_0_22px_rgba(249,115,22,0.35),inset_0_1px_0_rgba(255,255,255,0.18)]'
                    : 'border-white/10 bg-white/5 text-zinc-200'
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'pointer-events-none absolute inset-0 opacity-70',
                    active
                      ? 'bg-[radial-gradient(circle_at_20%_0%,rgba(249,115,22,0.35),transparent_55%)]'
                      : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent)]'
                  )}
                />
                <span
                  className={cn(
                    'relative flex h-7 w-7 min-h-7 min-w-7 items-center justify-center rounded-xl border',
                    active
                      ? 'border-orange-400/50 bg-orange-500/20 text-orange-300 shadow-[0_0_12px_rgba(249,115,22,0.45)]'
                      : 'border-white/10 bg-black/30 text-zinc-300'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.9} />
                </span>
                <span className="relative whitespace-nowrap text-[12px] font-semibold tracking-tight">
                  {filter.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {visibleItems.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-6 py-16 text-center">
          <p className="max-w-[28ch] text-sm font-medium text-zinc-400">
            {t('profile.emptySaved')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-[1px]">
          {visibleItems.map((item, index) => (
            <motion.article
              key={item.id}
              whileTap={{ scale: 0.98 }}
              className="group relative w-full aspect-[9/16] overflow-hidden bg-white/5 text-left select-none transform-gpu will-change-transform [backface-visibility:hidden] [transform:translateZ(0)]"
              style={NATIVE_APP_IMAGE_STYLE}
            >
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  router.push(
                    artistProfileHref({ id: item.artistId, username: item.artistUsername })
                  );
                }}
                className="absolute inset-0 touch-manipulation"
                aria-label={item.style ? styleLabel(item.style) : t('home.inspiracoes')}
              >
                <OptimizedImage
                  src={item.imageUrl}
                  alt={item.style ? styleLabel(item.style) : t('home.inspiracoes')}
                  className="object-cover w-full h-full"
                  priority={isEagerGridIndex(index)}
                />
              </button>
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 via-black/25 to-transparent"
              />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] flex items-end justify-between gap-2 px-2 pb-2">
                <span className="min-w-0 truncate text-[11px] font-semibold tracking-tight text-white">
                  {item.style ? styleLabel(item.style) : t('home.inspiracoes')}
                </span>
              </span>
              <button
                type="button"
                onClick={(event) => handleUnsave(item, event)}
                className="absolute bottom-1.5 right-1.5 z-[2] flex h-8 w-8 min-h-8 min-w-8 items-center justify-center rounded-full text-orange-400"
                aria-label="Salvar"
                aria-pressed
              >
                <Bookmark
                  className="h-3.5 w-3.5 shrink-0"
                  strokeWidth={1.9}
                  fill="currentColor"
                  aria-hidden
                />
              </button>
            </motion.article>
          ))}
        </div>
      )}
    </div>
  );
}
