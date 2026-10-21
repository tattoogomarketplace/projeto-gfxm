'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, RotateCcw } from 'lucide-react';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import {
  PORTFOLIO_BODY_PARTS,
  PORTFOLIO_STYLES,
  portfolioLabelResolver,
} from '@/lib/portfolio-metadata';
import type { MessageKey } from '@/lib/i18n/types';
import { cn } from '@/lib/utils';

export type PortfolioHealingFilter = 'all' | 'fresh' | 'healed';

const HEALING_OPTIONS: { value: Exclude<PortfolioHealingFilter, 'all'>; labelKey: MessageKey }[] = [
  { value: 'fresh', labelKey: 'gallery.fresh' },
  { value: 'healed', labelKey: 'gallery.healed' },
];

type FilterCategory = 'style' | 'body' | 'healing' | null;

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
        'flex min-h-11 min-w-[110px] shrink-0 flex-col whitespace-nowrap rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-left transition-colors active:scale-[0.98]',
        active ? 'border-orange-500/60' : 'hover:border-zinc-700'
      )}
    >
      <span className="whitespace-nowrap text-[10px] font-bold uppercase text-zinc-500">{label}</span>
      <span className="mt-0.5 flex items-center justify-between gap-2 text-sm text-zinc-200">
        <span className="min-w-0 truncate">{value ?? t('gallery.all')}</span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-zinc-500 transition-transform duration-200',
            open && 'rotate-180 text-orange-400'
          )}
          strokeWidth={1.75}
        />
      </span>
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

export function PortfolioFilterBar({
  style,
  bodyPart,
  healed,
  onStyleChange,
  onBodyPartChange,
  onHealingChange,
}: {
  style: string;
  bodyPart: string;
  healed: PortfolioHealingFilter;
  onStyleChange: (value: string) => void;
  onBodyPartChange: (value: string) => void;
  onHealingChange: (value: PortfolioHealingFilter) => void;
}) {
  const { triggerHaptic } = useHapticFeedback();
  const { t } = useI18n();
  const { styleLabel, bodyPartLabel } = portfolioLabelResolver(t);
  const [openCategory, setOpenCategory] = useState<FilterCategory>(null);

  useEffect(() => {
    if (!openCategory) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenCategory(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openCategory]);

  const toggleCategory = (category: Exclude<FilterCategory, null>) => {
    triggerHaptic('light');
    setOpenCategory((current) => (current === category ? null : category));
  };

  const applyStyle = (value: string) => {
    triggerHaptic('light');
    onStyleChange(value);
    setOpenCategory(null);
  };

  const applyBodyPart = (value: string) => {
    triggerHaptic('light');
    onBodyPartChange(value);
    setOpenCategory(null);
  };

  const applyHealing = (value: PortfolioHealingFilter) => {
    triggerHaptic('light');
    onHealingChange(value);
    setOpenCategory(null);
  };

  const clearFilters = () => {
    triggerHaptic('light');
    onStyleChange('');
    onBodyPartChange('');
    onHealingChange('all');
    setOpenCategory(null);
  };

  const hasFilters = Boolean(style || bodyPart || healed !== 'all');
  const styleValue = style ? styleLabel(style) : null;
  const bodyValue = bodyPart ? bodyPartLabel(bodyPart) : null;
  const healingValue =
    healed === 'fresh' ? t('gallery.fresh') : healed === 'healed' ? t('gallery.healed') : null;

  return (
    <div className="flex w-full flex-col">
      <div className="relative w-full">
        <div className="relative z-30 flex w-max min-w-full gap-3 overflow-x-auto pb-2 scrollbar-none">
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
              className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-2xl border border-black/[0.06] bg-white/85 shadow-[0_16px_40px_rgba(0,0,0,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/70 dark:shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
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
          className="mt-1 inline-flex min-h-11 items-center justify-center gap-1.5 self-start rounded-xl px-1 text-xs font-semibold text-zinc-500 transition-colors hover:text-orange-400"
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
          {t('gallery.clearFilters')}
        </button>
      ) : null}
    </div>
  );
}
