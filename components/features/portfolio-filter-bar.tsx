'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, RotateCcw, X } from 'lucide-react';
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

type DropdownPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

const subscribe = () => () => {};

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
        'pointer-events-auto flex min-h-11 min-w-[96px] shrink-0 flex-col whitespace-nowrap rounded-full border border-white/15 bg-[#121212]/20 px-3 py-1.5 text-left backdrop-blur-lg transition-colors active:scale-[0.98]',
        active ? 'border-orange-500/60' : 'hover:border-white/25'
      )}
    >
      <span className="whitespace-nowrap text-[9px] font-semibold uppercase tracking-wider text-gray-100 [text-shadow:_0_1px_2px_rgb(0_0_0_/_80%)]">{label}</span>
      <span className="mt-px flex items-center justify-between gap-1.5 text-xs leading-tight text-white [text-shadow:_0_1px_2px_rgb(0_0_0_/_80%)]">
        <span className="whitespace-nowrap">{value ?? t('gallery.all')}</span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-white drop-shadow-md transition-transform duration-200',
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
          : 'text-zinc-300 hover:bg-white/[0.04] hover:text-white'
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
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  const closeDropdown = useCallback(() => {
    setOpenCategory(null);
  }, []);

  const measureDropdownPosition = useCallback((): DropdownPosition | null => {
    const el = barRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const gutter = 12;
    const width = Math.min(rect.width, window.innerWidth - gutter * 2);
    const left = Math.min(Math.max(gutter, rect.left), window.innerWidth - width - gutter);
    const top = rect.bottom + 8;
    const maxHeight = Math.max(160, window.innerHeight - top - 24);
    return { top, left, width, maxHeight };
  }, []);

  const updateDropdownPosition = useCallback(() => {
    const next = measureDropdownPosition();
    if (next) setDropdownPosition(next);
  }, [measureDropdownPosition]);

  useEffect(() => {
    if (!openCategory) return;
    const onReposition = () => {
      updateDropdownPosition();
    };
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [openCategory, updateDropdownPosition]);

  useEffect(() => {
    if (!openCategory) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [openCategory]);

  useEffect(() => {
    if (!openCategory) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDropdown();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openCategory, closeDropdown]);

  const toggleCategory = (category: Exclude<FilterCategory, null>) => {
    triggerHaptic('light');
    if (openCategory === category) {
      setOpenCategory(null);
      return;
    }
    const next = measureDropdownPosition();
    if (next) setDropdownPosition(next);
    setOpenCategory(category);
  };

  const applyStyle = (value: string) => {
    triggerHaptic('light');
    onStyleChange(value);
    closeDropdown();
  };

  const applyBodyPart = (value: string) => {
    triggerHaptic('light');
    onBodyPartChange(value);
    closeDropdown();
  };

  const applyHealing = (value: PortfolioHealingFilter) => {
    triggerHaptic('light');
    onHealingChange(value);
    closeDropdown();
  };

  const clearFilters = () => {
    triggerHaptic('light');
    onStyleChange('');
    onBodyPartChange('');
    onHealingChange('all');
    closeDropdown();
  };

  const hasFilters = Boolean(style || bodyPart || healed !== 'all');
  const styleValue = style ? styleLabel(style) : null;
  const bodyValue = bodyPart ? bodyPartLabel(bodyPart) : null;
  const healingValue =
    healed === 'fresh' ? t('gallery.fresh') : healed === 'healed' ? t('gallery.healed') : null;

  const dropdownMenu =
    mounted && openCategory && dropdownPosition
      ? createPortal(
          <>
            <div
              className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-md transition-opacity"
              onClick={closeDropdown}
              aria-hidden="true"
            ></div>
            <div
              role="listbox"
              className="fixed z-[9999] bg-[#121214] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
              style={{
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                width: dropdownPosition.width,
                maxHeight: dropdownPosition.maxHeight,
              }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <span className="text-sm font-semibold tracking-tight text-zinc-100">
                  {openCategory === 'style'
                    ? t('gallery.style')
                    : openCategory === 'body'
                      ? t('gallery.bodyPart')
                      : t('gallery.healing')}
                </span>
                <button
                  type="button"
                  aria-label={t('gallery.closeFilter')}
                  onClick={closeDropdown}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.04] border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto p-2" style={{ maxHeight: Math.max(120, dropdownPosition.maxHeight - 56) }}>
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
          </>,
          document.body
        )
      : null;

  return (
    <div className="pointer-events-none flex w-full flex-col">
      <div ref={barRef} className="relative w-full">
        <div className="relative z-30 flex w-full items-center justify-center gap-2 overflow-x-auto no-scrollbar">
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
      </div>

      {hasFilters ? (
        <button
          type="button"
          onClick={clearFilters}
          className="pointer-events-auto mt-0.5 inline-flex min-h-11 items-center justify-center gap-1.5 self-start rounded-lg px-1 text-[11px] font-semibold text-zinc-500 transition-colors hover:text-orange-400"
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
          {t('gallery.clearFilters')}
        </button>
      ) : null}

      {dropdownMenu}
    </div>
  );
}
