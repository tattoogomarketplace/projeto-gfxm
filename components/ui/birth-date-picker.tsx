'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';

/**
 * Phase 11.4 - Apple-tier inline date selector.
 *
 * Replaces the native `<input type="date">`. In an installed (standalone) PWA
 * the OS calendar overlay captures global viewport touch events and permanently
 * swallows taps meant for the footer ("Termos de Uso e Privacidade"). This
 * component renders a fully local, portal-hosted popover whose geometry is
 * bounded to the viewport, so it can never bleed over the terms row.
 */

interface DateParts {
  year: number;
  month: number;
  day: number;
}

interface PopoverPosition {
  left: number;
  width: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
  placement: 'top' | 'bottom';
}

interface IntlWeekInfoLocale {
  getWeekInfo?: () => { firstDay: number };
  weekInfo?: { firstDay: number };
}

type CalendarView = 'days' | 'months' | 'years';

const FALLBACK_WEEK_START: Record<string, number> = {
  'pt-BR': 0,
  en: 0,
  ja: 0,
  ko: 0,
  'zh-CN': 0,
  hi: 0,
  ar: 6,
};

const POPOVER_MARGIN = 12;
const POPOVER_GAP = 8;
const ESTIMATED_POPOVER_HEIGHT = 372;

/** Assinatura vazia: o flag de montagem não depende de nenhum evento externo. */
const subscribeNoop = () => () => {};

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

function parseIso(value?: string | null): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const probe = new Date(year, month, day);
  if (
    probe.getFullYear() !== year ||
    probe.getMonth() !== month ||
    probe.getDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function getWeekStartsOn(locale: string): number {
  try {
    const intlLocale = new Intl.Locale(locale) as Intl.Locale & IntlWeekInfoLocale;
    const info = intlLocale.getWeekInfo?.() ?? intlLocale.weekInfo;
    if (info && typeof info.firstDay === 'number') {
      return info.firstDay % 7;
    }
  } catch {
    /* fall through to the static map */
  }
  return FALLBACK_WEEK_START[locale] ?? 1;
}

export interface BirthDatePickerProps {
  label: string;
  value?: string;
  onChange: (iso: string) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function BirthDatePicker({
  label,
  value,
  onChange,
  onBlur,
  error,
  disabled,
  className,
}: BirthDatePickerProps) {
  const { locale } = useI18n();
  const { triggerHaptic } = useHapticFeedback();

  // Detecção de cliente SEM `setState` dentro de efeito (evita cascading render
  // e satisfaz `react-hooks/set-state-in-effect`): o SSR resolve `false` e a
  // primeira renderização no cliente resolve `true`, liberando o portal.
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<CalendarView>('days');
  const [cursor, setCursor] = useState<{ year: number; month: number }>(() => {
    const parsed = parseIso(value);
    const now = new Date();
    return { year: parsed?.year ?? now.getFullYear(), month: parsed?.month ?? now.getMonth() };
  });
  const [yearPageStart, setYearPageStart] = useState(0);
  const [position, setPosition] = useState<PopoverPosition | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const weekStartsOn = useMemo(() => getWeekStartsOn(locale), [locale]);

  const formatters = useMemo(
    () => ({
      display: new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
      monthShort: new Intl.DateTimeFormat(locale, { month: 'short' }),
      monthYear: new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }),
      weekday: new Intl.DateTimeFormat(locale, { weekday: 'short' }),
    }),
    [locale]
  );

  const placeholder = useMemo(
    () =>
      formatters.display
        .formatToParts(new Date(2000, 0, 1))
        .map((part) => {
          if (part.type === 'day') return 'DD';
          if (part.type === 'month') return 'MM';
          if (part.type === 'year') return 'YYYY';
          return part.value;
        })
        .join(''),
    [formatters]
  );

  const weekdayLabels = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const dayIndex = (weekStartsOn + index) % 7;
        return formatters.weekday.format(new Date(2021, 7, 1 + dayIndex));
      }),
    [formatters, weekStartsOn]
  );

  const displayValue = useMemo(() => {
    const parsed = parseIso(value);
    if (!parsed) return '';
    return formatters.display.format(new Date(parsed.year, parsed.month, parsed.day));
  }, [formatters, value]);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger || typeof window === 'undefined') return;
    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - POPOVER_MARGIN;
    const spaceAbove = rect.top - POPOVER_MARGIN;
    // Always open upward when there is room: the field sits directly above the
    // terms checkbox + submit footer, so a downward panel could cover it. Only
    // drop below the field when there is no full-height space above, which
    // implies the field is near the top of the viewport and the footer is far
    // below the bounded panel.
    let placement: PopoverPosition['placement'];
    if (spaceAbove >= ESTIMATED_POPOVER_HEIGHT) {
      placement = 'top';
    } else if (spaceBelow >= ESTIMATED_POPOVER_HEIGHT) {
      placement = 'bottom';
    } else {
      placement = spaceAbove > spaceBelow ? 'top' : 'bottom';
    }
    const available = (placement === 'bottom' ? spaceBelow : spaceAbove) - POPOVER_GAP;
    const maxHeight = Math.max(200, Math.min(440, available));
    const width = Math.min(
      Math.max(rect.width, 264),
      window.innerWidth - POPOVER_MARGIN * 2
    );
    let left = rect.left;
    if (left + width > window.innerWidth - POPOVER_MARGIN) {
      left = window.innerWidth - POPOVER_MARGIN - width;
    }
    if (left < POPOVER_MARGIN) left = POPOVER_MARGIN;

    setPosition({
      left,
      width,
      maxHeight,
      placement,
      ...(placement === 'bottom'
        ? { top: rect.bottom + POPOVER_GAP }
        : { bottom: window.innerHeight - rect.top + POPOVER_GAP }),
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const handle = () => updatePosition();
    window.addEventListener('resize', handle);
    window.addEventListener('scroll', handle, true);
    window.addEventListener('orientationchange', handle);
    return () => {
      window.removeEventListener('resize', handle);
      window.removeEventListener('scroll', handle, true);
      window.removeEventListener('orientationchange', handle);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (event: Event) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('pointerdown', handleOutside, true);
    document.addEventListener('mousedown', handleOutside, true);
    document.addEventListener('touchstart', handleOutside, true);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handleOutside, true);
      document.removeEventListener('mousedown', handleOutside, true);
      document.removeEventListener('touchstart', handleOutside, true);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  const openPicker = () => {
    if (disabled) return;
    const parsed = parseIso(value);
    const now = new Date();
    setCursor({ year: parsed?.year ?? now.getFullYear(), month: parsed?.month ?? now.getMonth() });
    setView('days');
    setIsOpen(true);
    triggerHaptic('light');
  };

  const closePicker = useCallback(() => {
    setIsOpen(false);
    onBlur?.();
  }, [onBlur]);

  const now = new Date();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const firstWeekday = new Date(cursor.year, cursor.month, 1).getDay();
  const leadingBlanks = (firstWeekday - weekStartsOn + 7) % 7;
  const selected = parseIso(value);

  const isFutureDay = (day: number) =>
    cursor.year > now.getFullYear() ||
    (cursor.year === now.getFullYear() &&
      (cursor.month > now.getMonth() ||
        (cursor.month === now.getMonth() && day > now.getDate())));

  const isToday = (day: number) =>
    cursor.year === now.getFullYear() &&
    cursor.month === now.getMonth() &&
    day === now.getDate();

  const navButtonClass =
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/5 hover:text-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/70';

  const changeMonth = (delta: number) => {
    triggerHaptic('light');
    setCursor((current) => {
      const next = new Date(current.year, current.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  const changeYear = (delta: number) => {
    triggerHaptic('light');
    setCursor((current) => ({ ...current, year: current.year + delta }));
  };

  const changeYearPage = (delta: number) => {
    triggerHaptic('light');
    setYearPageStart((current) => current + delta * 12);
  };

  const openMonthsView = () => {
    triggerHaptic('light');
    setView('months');
  };

  const openYearsView = () => {
    triggerHaptic('light');
    setYearPageStart(Math.floor(cursor.year / 12) * 12);
    setView('years');
  };

  const selectDay = (day: number) => {
    triggerHaptic('light');
    onChange(toIso(cursor.year, cursor.month, day));
    closePicker();
    triggerRef.current?.focus({ preventScroll: true });
  };

  const selectMonth = (month: number) => {
    triggerHaptic('light');
    setCursor((current) => ({ ...current, month }));
    setView('days');
  };

  const selectYear = (year: number) => {
    triggerHaptic('light');
    setCursor((current) => ({ ...current, year }));
    setView('months');
  };

  const title =
    view === 'days'
      ? capitalize(formatters.monthYear.format(new Date(cursor.year, cursor.month, 1)))
      : view === 'months'
        ? String(cursor.year)
        : `${yearPageStart} – ${yearPageStart + 11}`;

  const handleTitleClick =
    view === 'days' ? openMonthsView : view === 'months' ? openYearsView : undefined;

  const handleTitleNav =
    view === 'days' ? changeMonth : view === 'months' ? changeYear : changeYearPage;

  const dayCells: Array<number | null> = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  return (
    <div className={cn('w-full space-y-1.5', className)}>
      {label && (
        <label className="ml-1 text-xs font-semibold uppercase tracking-wider text-muted">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => (isOpen ? closePicker() : openPicker())}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          className={cn(
            'relative z-0 flex h-12 w-full items-center justify-between gap-2 rounded-xl border px-4 py-2 text-left text-sm transition-colors duration-200 focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-50',
            'border-black/[0.04] bg-white text-[#0A0A0A] focus:border-orange-500 focus:ring-orange-500/60',
            'dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:backdrop-blur-xl dark:focus:border-orange-500 dark:focus:ring-orange-500/60',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/60'
          )}
        >
          <span
            className={cn(
              'truncate',
              displayValue ? 'text-inherit' : 'text-neutral-400 dark:text-neutral-500'
            )}
          >
            {displayValue || placeholder}
          </span>
          <CalendarDays
            className={cn('h-4 w-4 shrink-0', isOpen ? 'text-orange-500' : 'text-zinc-400')}
            strokeWidth={1.75}
          />
        </button>
      </div>
      {error && <span className="ml-1 text-[10px] font-medium text-red-500">{error}</span>}

      {mounted && isOpen && position
        ? createPortal(
            <motion.div
              ref={popoverRef}
              initial={{ opacity: 0, scale: 0.96, y: position.placement === 'bottom' ? -6 : 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 460, damping: 34, mass: 0.7 }}
              style={{
                position: 'fixed',
                left: position.left,
                width: position.width,
                maxHeight: position.maxHeight,
                ...(position.placement === 'bottom'
                  ? { top: position.top }
                  : { bottom: position.bottom }),
              }}
              className="z-9999 flex transform-gpu flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/95 p-3 text-white shadow-[0_18px_50px_rgba(0,0,0,0.6),0_0_24px_rgba(249,115,22,0.18)] backdrop-blur-xl"
              role="dialog"
              aria-modal="false"
              aria-label={label}
            >
              <div className="mb-2 flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={() => handleTitleNav(-1)}
                  aria-label="Previous"
                  className={navButtonClass}
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={handleTitleClick}
                  disabled={!handleTitleClick}
                  className={cn(
                    'min-h-9 flex-1 truncate rounded-lg px-2 text-sm font-semibold tabular-nums text-white transition-colors',
                    handleTitleClick && 'hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/70'
                  )}
                >
                  {title}
                </button>
                <button
                  type="button"
                  onClick={() => handleTitleNav(1)}
                  aria-label="Next"
                  className={navButtonClass}
                >
                  <ChevronRight className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-none">
                {view === 'days' ? (
                  <>
                    <div className="grid grid-cols-7 gap-1 pb-1">
                      {weekdayLabels.map((weekday, index) => (
                        <span
                          key={`${weekday}-${index}`}
                          className="flex h-7 items-center justify-center text-[10px] font-semibold uppercase tracking-wide text-zinc-500"
                        >
                          {weekday}
                        </span>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {dayCells.map((day, index) => {
                        if (day === null) {
                          return <span key={`blank-${index}`} className="h-9 w-full" aria-hidden />;
                        }
                        const future = isFutureDay(day);
                        const isSelected =
                          selected &&
                          selected.year === cursor.year &&
                          selected.month === cursor.month &&
                          selected.day === day;
                        const today = isToday(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            disabled={future}
                            onClick={() => selectDay(day)}
                            className={cn(
                              'flex h-9 w-full items-center justify-center rounded-lg text-[13px] font-medium tabular-nums transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/70',
                              future && 'cursor-not-allowed text-zinc-700',
                              !future &&
                                !isSelected &&
                                'text-zinc-200 hover:bg-white/5 active:scale-95',
                              !isSelected && today && 'border border-orange-500/60 text-orange-400',
                              isSelected &&
                                'border border-orange-400/50 bg-gradient-to-b from-orange-500 to-orange-600 font-bold text-black shadow-[0_0_16px_rgba(249,115,22,0.45)]'
                            )}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : view === 'months' ? (
                  <div className="grid grid-cols-3 gap-1.5 pb-1">
                    {Array.from({ length: 12 }, (_, month) => {
                      const active = month === cursor.month;
                      const futureMonth =
                        cursor.year === now.getFullYear() && month > now.getMonth();
                      return (
                        <button
                          key={month}
                          type="button"
                          disabled={futureMonth}
                          onClick={() => selectMonth(month)}
                          className={cn(
                            'flex h-11 items-center justify-center rounded-lg px-1 text-[12px] font-semibold capitalize transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/70',
                            futureMonth && 'cursor-not-allowed text-zinc-700',
                            !futureMonth &&
                              (active
                                ? 'border border-orange-400/50 bg-gradient-to-b from-orange-500 to-orange-600 text-black shadow-[0_0_16px_rgba(249,115,22,0.45)]'
                                : 'text-zinc-200 hover:bg-white/5')
                          )}
                        >
                          {formatters.monthShort.format(new Date(2000, month, 1))}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5 pb-1">
                    {Array.from({ length: 12 }, (_, offset) => {
                      const year = yearPageStart + offset;
                      const active = year === cursor.year;
                      const futureYear = year > now.getFullYear();
                      return (
                        <button
                          key={year}
                          type="button"
                          disabled={futureYear}
                          onClick={() => selectYear(year)}
                          className={cn(
                            'flex h-11 items-center justify-center rounded-lg text-[12px] font-semibold tabular-nums transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/70',
                            futureYear && 'cursor-not-allowed text-zinc-700',
                            !futureYear &&
                              (active
                                ? 'border border-orange-400/50 bg-gradient-to-b from-orange-500 to-orange-600 text-black shadow-[0_0_16px_rgba(249,115,22,0.45)]'
                                : 'text-zinc-200 hover:bg-white/5')
                          )}
                        >
                          {year}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>,
            document.body
          )
        : null}
    </div>
  );
}
