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
import { Loader2, Radio, Sparkles, X } from 'lucide-react';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

export const FLASH_NOTE_MAX_LENGTH = 80;

const DISMISS_DISTANCE = 128;
const DISMISS_VELOCITY = 700;

/**
 * Strict, STATIC dictionary of complete Tailwind gradient classes. These string
 * literals must never be assembled dynamically (e.g. `from-[${color}]`) — doing
 * so hides them from Tailwind's JIT scanner and is the exact cause of the "dead
 * color" regression, because no gradient utility ever gets emitted.
 */
const GRADIENTS = {
  graphite: 'bg-gradient-to-br from-[#131313] via-[#0a0a0a] to-[#1c1c1c]',
  ember: 'bg-gradient-to-br from-[#1b0a02] via-[#3d1404] to-[#0a0a0a]',
  copper: 'bg-gradient-to-br from-[#1e0b03] via-[#4b1405] to-[#130705]',
  emerald: 'bg-gradient-to-br from-[#03130c] via-[#063a25] to-[#04120c]',
} as const;

type FlashNoteBackgroundId = keyof typeof GRADIENTS;

type FlashNoteBackground = {
  id: FlashNoteBackgroundId;
  /** Decorative ring color — uses the brand tokens. */
  ring: string;
  /**
   * Raw CSS gradient. This is the bulletproof source of truth for the live
   * preview: it is applied inline, so it renders with absolute certainty
   * regardless of Tailwind's compiler / purge configuration.
   */
  css: string;
};

/**
 * Premium dark-luxury surfaces. Each gradient is derived from a brand token
 * (graphite #0a0a0a, orange #F97316, copper #D9460E, emerald #10B981) so the
 * composer never drifts from the TattooGo MK palette.
 */
const BACKGROUNDS: FlashNoteBackground[] = [
  {
    id: 'graphite',
    ring: '#3f3f46',
    css: 'linear-gradient(155deg, #131313 0%, #0a0a0a 58%, #1c1c1c 100%)',
  },
  {
    id: 'ember',
    ring: '#F97316',
    css: 'linear-gradient(155deg, #1b0a02 0%, #3d1404 54%, #0a0a0a 100%)',
  },
  {
    id: 'copper',
    ring: '#D9460E',
    css: 'linear-gradient(155deg, #1e0b03 0%, #4b1405 48%, #130705 100%)',
  },
  {
    id: 'emerald',
    ring: '#10B981',
    css: 'linear-gradient(155deg, #03130c 0%, #063a25 54%, #04120c 100%)',
  },
];

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
};

/**
 * Isolated controlled textarea. Subscribes to the draft store so the input can
 * stay fully controlled while the keystroke re-render is confined to this node.
 */
const FlashNoteTextarea = memo(function FlashNoteTextarea({
  store,
  maxLength,
  placeholder,
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
        'relative z-10 block w-full resize-none border-0 bg-transparent px-5 py-5',
        'backdrop-blur-none',
        'text-lg font-medium leading-relaxed tracking-tight text-white',
        'outline-none placeholder:text-zinc-600'
      )}
      // Inline override guarantees the field never masks the gradient behind it,
      // even against the global `textarea { background-color }` base rule.
      style={{ backgroundColor: 'transparent' }}
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

type BackgroundSelectorProps = {
  activeId: FlashNoteBackgroundId;
  label: string;
  onSelect: (id: FlashNoteBackgroundId) => void;
};

/**
 * Memoized color deck. Because its props are independent from the draft, it is
 * completely inert while the user types — it only re-renders when a color is
 * actually picked.
 */
const BackgroundSelector = memo(function BackgroundSelector({
  activeId,
  label,
  onSelect,
}: BackgroundSelectorProps) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 pt-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </p>
      <div className="flex items-center gap-2.5" role="radiogroup" aria-label={label}>
        {BACKGROUNDS.map((option) => {
          const active = option.id === activeId;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={option.id}
              onClick={() => {
                if (active) return;
                onSelect(option.id);
              }}
              className={cn(
                'h-8 w-8 min-h-8 min-w-8 rounded-full transition-transform duration-200 active:scale-90',
                GRADIENTS[option.id],
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
  onClose: () => void;
  /** Resolves `true` once the note has been persisted (optimistically or not). */
  onPublish: (content: string) => Promise<boolean>;
};

export function FlashNoteCreatorSheet({
  open,
  isEditing = false,
  initialContent = '',
  onClose,
  onPublish,
}: FlashNoteCreatorSheetProps) {
  const { t } = useI18n();
  const { triggerHaptic } = useHapticFeedback();

  const storeRef = useRef<DraftStore | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createDraftStore(initialContent);
  }
  const store = storeRef.current;

  const [backgroundId, setBackgroundId] = useState<FlashNoteBackgroundId>(BACKGROUNDS[0].id);
  const [hasText, setHasText] = useState(() => initialContent.trim().length > 0);
  const [isPending, startTransition] = useTransition();
  // Urgent, synchronous flag so the spinner paints on the very first frame.
  const [isPublishing, setIsPublishing] = useState(false);

  const background = useMemo(
    () => BACKGROUNDS.find((option) => option.id === backgroundId) ?? BACKGROUNDS[0],
    [backgroundId]
  );

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
  // reflects the latest published content.
  useEffect(() => {
    if (!open) return;
    store.set(initialContent);
    setHasText(initialContent.trim().length > 0);
    setBackgroundId(BACKGROUNDS[0].id);
  }, [open, initialContent, store]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, busy, onClose]);

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
            drag={busy ? false : 'y'}
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
              <button
                type="button"
                onClick={dismiss}
                disabled={busy}
                aria-label={t('common.close')}
                className="flex h-11 w-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border border-white/[0.06] text-zinc-400 transition-colors active:scale-[0.96] disabled:opacity-40"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
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
                {/* Layer 2 — content sits above the gradient, fully transparent. */}
                <div className="relative z-10 bg-transparent backdrop-blur-none">
                  <FlashNoteTextarea
                    store={store}
                    maxLength={FLASH_NOTE_MAX_LENGTH}
                    placeholder={t('flash.placeholder')}
                  />
                </div>
              </div>
            </div>

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
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

export default FlashNoteCreatorSheet;
