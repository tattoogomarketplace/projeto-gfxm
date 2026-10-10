'use client';

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Loader2,
  Radio,
  Sparkles,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import {
  FLASH_NOTE_BACKGROUNDS,
  FLASH_NOTE_GRADIENTS,
  FLASH_NOTE_MAX_LENGTH,
  cycleFlashNoteAlign,
  cycleFlashNoteFont,
  getFlashNoteAlignByClass,
  getFlashNoteAlignById,
  getFlashNoteFontByClass,
  getFlashNoteFontById,
  type FlashNoteAlignId,
  type FlashNoteBackgroundId,
  type FlashNoteFontId,
  type FlashNoteStyle,
} from '@/lib/flash-notes-style';

export { FLASH_NOTE_MAX_LENGTH };

const DISMISS_DISTANCE = 128;
const DISMISS_VELOCITY = 700;

const ALIGN_ICONS: Record<FlashNoteAlignId, LucideIcon> = {
  left: AlignLeft,
  center: AlignCenter,
  right: AlignRight,
};

const MAX_TEXTAREA_HEIGHT = 260;

/**
 * Tiny external store for the composer draft. It lets the textarea and the
 * character counter subscribe independently, so a keystroke only re-renders
 * those two leaf nodes — never the sheet shell, its framer-motion drag layer,
 * or the background/color buttons. This is what keeps typing at a locked 60fps.
 */
type DraftStore = {
  get: () => string;
  set: (value: string) => void;
  subscribe: (listener: () => void) => () => void;
};

function createDraftStore(initial: string): DraftStore {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: (next: string) => {
      if (value === next) return;
      value = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

type FlashNoteTextareaProps = {
  store: DraftStore;
  maxLength: number;
  placeholder: string;
  alignClass: string;
  fontClass: string;
};

/**
 * Isolated controlled textarea. Subscribes to the draft store so the input can
 * stay fully controlled while the keystroke re-render is confined to this node.
 */
const FlashNoteTextarea = memo(function FlashNoteTextarea({
  store,
  maxLength,
  placeholder,
  alignClass,
  fontClass,
}: FlashNoteTextareaProps) {
  const value = useSyncExternalStore(store.subscribe, store.get, store.get);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fluid auto-expanding textarea — grows with content, never scrolls on itself.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [value]);

  // Focus once the entrance animation settles.
  useEffect(() => {
    const focusTimer = window.setTimeout(() => textareaRef.current?.focus(), 260);
    return () => window.clearTimeout(focusTimer);
  }, []);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(event) => store.set(event.target.value.slice(0, maxLength))}
      maxLength={maxLength}
      rows={3}
      placeholder={placeholder}
      className={cn(
        'relative z-10 block w-full resize-none px-5 py-5',
        // Nuclear override — destroys any global/base `textarea` background,
        // focus ring, outline, or border so the gradient layer is never masked.
        '!border-none !bg-transparent !outline-none !ring-0 backdrop-blur-none',
        'text-lg font-medium leading-relaxed tracking-tight text-white',
        'placeholder:text-zinc-600',
        alignClass,
        fontClass
      )}
      // Inline override guarantees the field never masks the gradient behind it,
      // even against the global `textarea { background-color }` base rule.
      style={{ backgroundColor: 'transparent', backgroundImage: 'none' }}
    />
  );
});

type FlashNoteCounterProps = {
  store: DraftStore;
  maxLength: number;
};

/** Subscribes to the draft store in isolation — the sheet chrome never updates. */
const FlashNoteCounter = memo(function FlashNoteCounter({
  store,
  maxLength,
}: FlashNoteCounterProps) {
  const value = useSyncExternalStore(store.subscribe, store.get, store.get);
  const remaining = maxLength - value.length;
  return (
    <span
      className={cn(
        'text-xs font-semibold tabular-nums transition-colors',
        remaining < 8 ? 'text-orange-400' : 'text-zinc-500'
      )}
    >
      {remaining}
    </span>
  );
});

type ComposerControlsProps = {
  backgroundId: FlashNoteBackgroundId;
  align: FlashNoteAlignId;
  font: FlashNoteFontId;
  backgroundLabel: string;
  alignLabel: string;
  fontLabel: string;
  onSelectBackground: (id: FlashNoteBackgroundId) => void;
  onCycleAlign: () => void;
  onCycleFont: () => void;
};

/**
 * Minimalist Instagram-style cycling toggles + brand-token color deck.
 * Memoized and independent from the draft so it stays inert while typing.
 */
const ComposerControls = memo(function ComposerControls({
  backgroundId,
  align,
  font,
  backgroundLabel,
  alignLabel,
  fontLabel,
  onSelectBackground,
  onCycleAlign,
  onCycleFont,
}: ComposerControlsProps) {
  const AlignIcon = ALIGN_ICONS[align];
  const typeface = getFlashNoteFontById(font);

  return (
    <div className="flex items-center justify-between gap-3 px-5 pt-3">
      <div className="flex items-center gap-2">
        {/* Alignment — tap cycles left → center → right. */}
        <button
          type="button"
          onClick={onCycleAlign}
          aria-label={`${alignLabel}: ${align}`}
          className="flex h-9 w-9 min-h-9 min-w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-zinc-200 transition-transform active:scale-90"
        >
          <AlignIcon className="h-4 w-4" strokeWidth={1.9} />
        </button>

        {/* Typography — tap cycles Classic → Editorial → Neon. */}
        <button
          type="button"
          onClick={onCycleFont}
          aria-label={`${fontLabel}: ${typeface.label}`}
          className="flex h-9 min-h-9 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 text-white transition-transform active:scale-95"
        >
          <span className={cn('text-[15px] font-semibold leading-none', typeface.glyphClass)}>
            Aa
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
            {typeface.label}
          </span>
        </button>
      </div>

      <div className="flex items-center gap-2.5" role="radiogroup" aria-label={backgroundLabel}>
        {FLASH_NOTE_BACKGROUNDS.map((option) => {
          const active = option.id === backgroundId;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={option.id}
              onClick={() => {
                if (active) return;
                onSelectBackground(option.id);
              }}
              className={cn(
                'h-8 w-8 min-h-8 min-w-8 rounded-full transition-transform duration-200 active:scale-90',
                FLASH_NOTE_GRADIENTS[option.id],
                active ? 'scale-110' : 'scale-100'
              )}
              style={{
                // Raw CSS guarantees the swatch paints even if a utility is purged.
                backgroundImage: option.css,
                boxShadow: active
                  ? `0 0 0 2px #0d0d0d, 0 0 0 4px ${option.ring}`
                  : `0 0 0 1px rgba(255,255,255,0.14)`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
});

type FlashNoteCreatorSheetProps = {
  open: boolean;
  isEditing?: boolean;
  initialContent?: string;
  initialBackgroundId?: string;
  initialFontClass?: string;
  initialAlignClass?: string;
  onClose: () => void;
  /** Resolves `true` once the note has been persisted (optimistically or not). */
  onPublish: (content: string, style: FlashNoteStyle) => Promise<boolean>;
  /** Present only when editing; resolves `true` once the note is removed. */
  onDelete?: () => Promise<boolean>;
};

export function FlashNoteCreatorSheet({
  open,
  isEditing = false,
  initialContent = '',
  initialBackgroundId,
  initialFontClass,
  initialAlignClass,
  onClose,
  onPublish,
  onDelete,
}: FlashNoteCreatorSheetProps) {
  const { t } = useI18n();
  const { triggerHaptic } = useHapticFeedback();

  const storeRef = useRef<DraftStore | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createDraftStore(initialContent);
  }
  const store = storeRef.current;

  const [backgroundId, setBackgroundId] = useState<FlashNoteBackgroundId>(
    () => getFlashNoteBackground(initialBackgroundId).id
  );
  const [align, setAlign] = useState<FlashNoteAlignId>(
    () => getFlashNoteAlignByClass(initialAlignClass).id
  );
  const [font, setFont] = useState<FlashNoteFontId>(
    () => getFlashNoteFontByClass(initialFontClass).id
  );
  const [hasText, setHasText] = useState(() => initialContent.trim().length > 0);
  const [isPending, startTransition] = useTransition();
  // Urgent, synchronous flag so the spinner paints on the very first frame.
  const [isPublishing, setIsPublishing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const background = useMemo(() => getFlashNoteBackground(backgroundId), [backgroundId]);
  const alignment = useMemo(() => getFlashNoteAlignById(align), [align]);
  const typeface = useMemo(() => getFlashNoteFontById(font), [font]);

  const busy = isPending || isPublishing;
  const canPublish = hasText && !busy;

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // Mirror the store's emptiness into local state — but only flip it on the
  // empty/non-empty boundary. Ordinary keystrokes therefore never schedule a
  // re-render of the sheet shell or its framer-motion drag layer.
  useEffect(() => {
    let previous = store.get().trim().length > 0;
    setHasText(previous);
    return store.subscribe(() => {
      const next = store.get().trim().length > 0;
      if (next === previous) return;
      previous = next;
      setHasText(next);
    });
  }, [store]);

  // Re-seed the draft every time the sheet is opened so an edited note always
  // reflects the latest published content AND its persisted style.
  useEffect(() => {
    if (!open) return;
    store.set(initialContent);
    setHasText(initialContent.trim().length > 0);
    setBackgroundId(getFlashNoteBackground(initialBackgroundId).id);
    setAlign(getFlashNoteAlignByClass(initialAlignClass).id);
    setFont(getFlashNoteFontByClass(initialFontClass).id);
    setConfirmDelete(false);
  }, [open, initialContent, initialBackgroundId, initialFontClass, initialAlignClass, store]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || busy) return;
      if (confirmDelete) {
        setConfirmDelete(false);
        return;
      }
      onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, busy, onClose, confirmDelete]);

  const dismiss = useCallback(() => {
    if (busy) return;
    triggerHaptic('light');
    onClose();
  }, [busy, onClose, triggerHaptic]);

  const handleDragEnd = useCallback(
    (_event: unknown, info: PanInfo) => {
      if (busy) return;
      if (info.offset.y > DISMISS_DISTANCE || info.velocity.y > DISMISS_VELOCITY) {
        triggerHaptic('light');
        onClose();
      }
    },
    [busy, onClose, triggerHaptic]
  );

  const handleSelectBackground = useCallback(
    (id: FlashNoteBackgroundId) => {
      triggerHaptic('light');
      setBackgroundId(id);
    },
    [triggerHaptic]
  );

  const handleCycleAlign = useCallback(() => {
    triggerHaptic('light');
    setAlign((current) => cycleFlashNoteAlign(current));
  }, [triggerHaptic]);

  const handleCycleFont = useCallback(() => {
    triggerHaptic('light');
    setFont((current) => cycleFlashNoteFont(current));
  }, [triggerHaptic]);

  const requestDelete = useCallback(() => {
    if (busy) return;
    triggerHaptic('light');
    setConfirmDelete(true);
  }, [busy, triggerHaptic]);

  const handleDelete = useCallback(() => {
    if (!onDelete || busy) return;
    setConfirmDelete(false);
    triggerHaptic('medium');
    setIsPublishing(true);
    startTransition(async () => {
      try {
        const deleted = await onDelete();
        if (!deleted) return;
        triggerHaptic('success');
        toast.success(t('toast.flashDeleted'));
        onClose();
      } finally {
        setIsPublishing(false);
      }
    });
  }, [busy, onClose, onDelete, t, triggerHaptic]);

  const handlePublish = useCallback(() => {
    const content = store.get().trim();
    if (!content || busy) return;
    triggerHaptic('medium');
    // Set the pending UI urgently so the button + spinner react on the same
    // frame as the tap; the transition then carries the async network work.
    setIsPublishing(true);
    startTransition(async () => {
      try {
        const published = await onPublish(content);
        if (!published) return;
        triggerHaptic('heavy');
        toast.success(t('toast.flashLive'));
        onClose();
      } finally {
        setIsPublishing(false);
      }
    });
  }, [busy, onClose, onPublish, store, t, triggerHaptic]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="flash-note-creator"
          className="fixed inset-0 z-[95] flex h-[100dvh] w-full flex-col justify-end overflow-hidden transform-gpu will-change-transform"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.button
            type="button"
            aria-label={t('common.close')}
            onClick={dismiss}
            className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label={isEditing ? t('flash.update') : t('flash.new')}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 42, mass: 0.9 }}
            drag={busy || confirmDelete ? false : 'y'}
            dragDirectionLock
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.35 }}
            onDragEnd={handleDragEnd}
            className={cn(
              'relative mx-auto flex w-full max-w-app flex-col overflow-hidden rounded-t-[28px]',
              'gpu-layer transform-gpu will-change-transform border-t border-white/[0.08] bg-[#0d0d0d] text-white',
              'shadow-[0_-24px_60px_rgba(0,0,0,0.55)]'
            )}
          >
            <span
              aria-hidden
              className="mx-auto mt-3 h-1.5 w-11 shrink-0 rounded-full bg-white/15"
            />

            <header className="flex items-start justify-between gap-3 px-5 pt-4">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-500">
                  <Radio className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
                  {t('flash.benchStatus')}
                </p>
                <h2 className="mt-1 text-[22px] font-bold leading-tight tracking-tight text-white">
                  {isEditing ? t('flash.update') : t('flash.new')}
                </h2>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {isEditing && onDelete ? (
                  <button
                    type="button"
                    onClick={requestDelete}
                    disabled={busy}
                    aria-label={t('common.delete')}
                    className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-full border border-red-500/[0.14] text-red-400 transition-colors active:scale-[0.96] disabled:opacity-40"
                  >
                    <Trash2 className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={dismiss}
                  disabled={busy}
                  aria-label={t('common.close')}
                  className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-full border border-white/[0.06] text-zinc-400 transition-colors active:scale-[0.96] disabled:opacity-40"
                >
                  <X className="h-5 w-5" strokeWidth={1.75} />
                </button>
              </div>
            </header>

            {/* Composer canvas — WYSIWYG surface, typography first. */}
            <div className="px-5 pb-2 pt-4">
              <div className="relative overflow-hidden rounded-3xl border border-white/[0.08]">
                {/* Layer 0 — gradient background. Raw inline CSS keeps it immune
                    to Tailwind purging, so selecting a color always paints. */}
                <div
                  aria-hidden
                  className={cn('absolute inset-0 z-0 bg-transparent', GRADIENTS[background.id])}
                  style={{ background: background.css }}
                />
                {/* Layer 1 — decorative brand glow. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-10 -top-12 z-[1] h-32 w-32 rounded-full blur-3xl transition-[background-color] duration-200"
                  style={{ backgroundColor: `${background.ring}33` }}
                />
                {/* Layer 2 — vignette. Subtle darkening so white text always pops. */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 z-[2] bg-black/20"
                  style={{
                    backgroundImage:
                      'radial-gradient(120% 100% at 50% 45%, rgba(0,0,0,0) 42%, rgba(0,0,0,0.28) 100%)',
                  }}
                />
                {/* Layer 3 — content sits above the gradient, fully transparent. */}
                <div className="relative z-10 bg-transparent backdrop-blur-none">
                  <FlashNoteTextarea
                    store={store}
                    maxLength={FLASH_NOTE_MAX_LENGTH}
                    placeholder={t('flash.placeholder')}
                    alignClass={alignment.className}
                    fontClass={typeface.className}
                  />
                </div>
              </div>
            </div>

            {/* Creator toolbar — alignment + typography. */}
            <CreatorControls
              align={align}
              font={font}
              alignLabel={t('flash.alignment')}
              fontLabel={t('flash.typography')}
              onAlign={handleSelectAlign}
              onFont={handleSelectFont}
            />

            {/* Background selector — brand-token gradients. */}
            <BackgroundSelector
              activeId={backgroundId}
              label={t('flash.background')}
              onSelect={handleSelectBackground}
            />

            {/* Live indicator + counter. */}
            <div className="flex items-center justify-between gap-3 px-5 pt-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-[11px] font-semibold text-orange-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
                </span>
                {t('flash.live24h')}
              </span>
              <FlashNoteCounter store={store} maxLength={FLASH_NOTE_MAX_LENGTH} />
            </div>

            {/* Glowing CTA — safe-area padded. */}
            <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5">
              <button
                type="button"
                onClick={handlePublish}
                disabled={!canPublish}
                aria-busy={busy}
                className={cn(
                  'group inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl px-6 text-[15px] font-bold tracking-tight',
                  'transition-[transform,box-shadow,filter] duration-150 active:scale-[0.98]',
                  canPublish
                    ? 'bg-gradient-to-b from-orange-500 to-orange-600 text-white shadow-[0_0_28px_rgba(249,115,22,0.5)]'
                    : 'cursor-not-allowed bg-white/[0.06] text-zinc-500 shadow-none'
                )}
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.6} />
                    {t('flash.publishing')}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" strokeWidth={2.4} />
                    {isEditing ? t('flash.updateNote') : t('flash.publishNote')}
                  </>
                )}
              </button>
            </div>

            {/* Destructive confirm — Apple-tier alert dialog, never shifts layout. */}
            <AnimatePresence>
              {confirmDelete ? (
                <motion.div
                  key="flash-delete-confirm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16 }}
                  className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 px-6 backdrop-blur-sm"
                >
                  <motion.div
                    role="alertdialog"
                    aria-modal="true"
                    aria-label={t('flash.deleteTitle')}
                    initial={{ scale: 0.94, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.96, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    className="w-full max-w-sm rounded-3xl border border-white/[0.08] bg-[#151515] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
                  >
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 text-red-400">
                      <Trash2 className="h-5 w-5" strokeWidth={1.9} />
                    </div>
                    <h3 className="mt-4 text-center text-lg font-bold tracking-tight text-white">
                      {t('flash.deleteTitle')}
                    </h3>
                    <div className="mt-6 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setConfirmDelete(false);
                        }}
                        className="flex min-h-[48px] flex-1 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 text-[15px] font-semibold text-zinc-300 transition-colors active:scale-[0.98]"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="flex min-h-[48px] flex-1 items-center justify-center rounded-2xl bg-gradient-to-b from-red-500 to-red-600 px-4 text-[15px] font-bold text-white shadow-[0_0_24px_rgba(239,68,68,0.45)] transition-transform active:scale-[0.98]"
                      >
                        {t('common.delete')}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

export default FlashNoteCreatorSheet;
