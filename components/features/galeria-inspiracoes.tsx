'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Images, RotateCcw, Sparkles } from 'lucide-react';
import { GaleriaCard } from '@/components/features/galeria-card';
import { GlassContainer } from '@/components/ui/glass-container';
import { Skeleton } from '@/components/ui/skeleton';
import { useGaleria } from '@/hooks/use-galeria';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import {
  PORTFOLIO_BODY_PARTS,
  PORTFOLIO_STYLES,
  bodyPartLabel,
  styleLabel,
} from '@/lib/portfolio-metadata';
import type { GaleriaHealingFilter } from '@/lib/types/galeria';
import type { MessageKey } from '@/lib/i18n/types';
import { cn } from '@/lib/utils';

type GaleriaInspiracoesProps = {
  onStartConversation: (tatuadorId: string, artworkId: string) => void;
};

const HEALING_OPTIONS: { value: Exclude<GaleriaHealingFilter, 'all'>; labelKey: MessageKey }[] = [
  { value: 'fresh', labelKey: 'gallery.fresh' },
  { value: 'healed', labelKey: 'gallery.healed' },
];

type FilterCategory = 'style' | 'body' | 'healing' | null;

const ENTRY_CARD_CLASS =
  'group flex min-h-11 w-full items-center gap-3 rounded-2xl border border-black/[0.04] bg-white px-4 py-3 text-left shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-all hover:border-orange-500/40 hover:bg-orange-500/[0.04] active:scale-[0.99] dark:border-white/[0.05] dark:bg-white/[0.03] dark:shadow-none';

function FilterTrigger({
  label,
  value,
  open,
  onClick,
}: {
  label: string;
  value: string | null;
  open: boolean;
  onClick: () => void;
}) {
  const { t } = useI18n();
  const active = Boolean(value) || open;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-haspopup="listbox"
      className={cn(
        'flex min-h-11 min-w-0 flex-1 items-center justify-between gap-1.5 rounded-xl border px-3 py-2 text-left transition-all active:scale-[0.98]',
        active
          ? 'border-orange-500 bg-orange-500/15 text-orange-300 shadow-[0_0_16px_rgba(249,115,22,0.28)]'
          : 'border-black/[0.04] bg-white text-neutral-700 shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:border-orange-500/40 hover:text-neutral-900 dark:border-white/[0.05] dark:bg-white/[0.03] dark:text-zinc-300 dark:shadow-none dark:hover:text-zinc-100'
      )}
    >
      <span className="min-w-0">
        <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          {label}
        </span>
        <span className="mt-0.5 block truncate text-xs font-semibold tracking-tight">
          {value ?? t('gallery.all')}
        </span>
      </span>
      <ChevronDown
        className={cn(
          'h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-200',
          open && 'rotate-180 text-orange-400'
        )}
        strokeWidth={1.75}
      />
    </button>
  );
}

function FilterOption({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        'flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm font-semibold tracking-tight transition-colors active:scale-[0.99]',
        selected
          ? 'bg-orange-500/15 text-orange-300'
          : 'text-neutral-700 hover:bg-black/[0.04] hover:text-neutral-900 dark:text-zinc-300 dark:hover:bg-white/[0.04] dark:hover:text-white'
      )}
    >
      {children}
    </button>
  );
}

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
  const [openCategory, setOpenCategory] = useState<FilterCategory>(null);
  const { triggerHaptic } = useHapticFeedback();
  const { t } = useI18n();

  useEffect(() => {
    if (!openCategory) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenCategory(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openCategory]);

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

  const toggleCategory = (category: Exclude<FilterCategory, null>) => {
    triggerHaptic('light');
    setOpenCategory((current) => (current === category ? null : category));
  };

  const applyStyle = (value: string) => {
    triggerHaptic('light');
    setStyle(value);
    setOpenCategory(null);
  };

  const applyBodyPart = (value: string) => {
    triggerHaptic('light');
    setBodyPart(value);
    setOpenCategory(null);
  };

  const applyHealing = (value: GaleriaHealingFilter) => {
    triggerHaptic('light');
    setHealed(value);
    setOpenCategory(null);
  };

  const clearFilters = () => {
    triggerHaptic('light');
    setStyle('');
    setBodyPart('');
    setHealed('all');
    setOpenCategory(null);
  };

  const styleValue = style ? styleLabel(style) : null;
  const bodyValue = bodyPart ? bodyPartLabel(bodyPart) : null;
  const healingValue =
    healed === 'fresh' ? t('gallery.fresh') : healed === 'healed' ? t('gallery.healed') : null;

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

      <div>
        <div className="relative">
          <div className="relative z-30 grid grid-cols-3 gap-2">
            <FilterTrigger
              label={t('gallery.style')}
              value={styleValue}
              open={openCategory === 'style'}
              onClick={() => toggleCategory('style')}
            />
            <FilterTrigger
              label={t('gallery.bodyPart')}
              value={bodyValue}
              open={openCategory === 'body'}
              onClick={() => toggleCategory('body')}
            />
            <FilterTrigger
              label={t('gallery.healing')}
              value={healingValue}
              open={openCategory === 'healing'}
              onClick={() => toggleCategory('healing')}
            />
          </div>

          {openCategory ? (
            <>
              <button
                type="button"
                aria-label={t('gallery.closeFilter')}
                className="fixed inset-0 z-20 cursor-default"
                onClick={() => setOpenCategory(null)}
              />
              <div
                role="listbox"
                className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-[0_16px_40px_rgba(0,0,0,0.12)] dark:border-white/[0.05] dark:bg-white/[0.04] dark:shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
              >
              <div className="max-h-72 overflow-y-auto p-2">
                {openCategory === 'style' ? (
                  <>
                    <FilterOption selected={!style} onClick={() => applyStyle('')}>
                      {t('gallery.allStyles')}
                    </FilterOption>
                    {PORTFOLIO_STYLES.map((item) => (
                      <FilterOption
                        key={`style-${item}`}
                        selected={style === item}
                        onClick={() => applyStyle(item)}
                      >
                        {styleLabel(item)}
                      </FilterOption>
                    ))}
                  </>
                ) : null}

                {openCategory === 'body' ? (
                  <>
                    <FilterOption selected={!bodyPart} onClick={() => applyBodyPart('')}>
                      {t('gallery.allParts')}
                    </FilterOption>
                    {PORTFOLIO_BODY_PARTS.map((item) => (
                      <FilterOption
                        key={`body-${item}`}
                        selected={bodyPart === item}
                        onClick={() => applyBodyPart(item)}
                      >
                        {bodyPartLabel(item)}
                      </FilterOption>
                    ))}
                  </>
                ) : null}

                {openCategory === 'healing' ? (
                  <>
                    <FilterOption selected={healed === 'all'} onClick={() => applyHealing('all')}>
                      {t('gallery.allHealing')}
                    </FilterOption>
                    {HEALING_OPTIONS.map((option) => (
                      <FilterOption
                        key={option.value}
                        selected={healed === option.value}
                        onClick={() => applyHealing(option.value)}
                      >
                        {t(option.labelKey)}
                      </FilterOption>
                    ))}
                  </>
                ) : null}
              </div>
            </div>
            </>
          ) : null}
        </div>

        {hasFilters ? (
          <button
            type="button"
            onClick={clearFilters}
            className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-black/[0.04] bg-white px-3.5 text-xs font-semibold text-neutral-600 transition-colors hover:border-orange-500/40 hover:text-orange-500 dark:border-white/[0.05] dark:bg-white/[0.03] dark:text-zinc-400 dark:hover:text-orange-300"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
            {t('gallery.clearFilters')}
          </button>
        ) : null}
      </div>

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
