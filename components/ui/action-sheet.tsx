'use client';

import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * ACTION SHEET — BOTTOM SHEET NATIVO (iOS/VisionOS)
 *
 * Menu de ações ancorado no rodapé, com física de mola e arraste não-bloqueante.
 * Renderiza via portal em `document.body`, então o fundo permanece intocado —
 * zero layout shift (CLS). Padrão inset com `rounded-t-[28px]`, `bg-zinc-950` e
 * borda `zinc-800/80` para respeitar os tokens Dark Luxury.
 */

const subscribe = () => () => {};

const backdropMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
} as const;

export type ActionSheetAction = {
  id: string;
  label: string;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
};

export type ActionSheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  actions: ActionSheetAction[];
  cancelLabel?: string;
};

export function ActionSheet({
  open,
  onClose,
  title,
  description,
  actions,
  cancelLabel = 'Cancelar',
}: ActionSheetProps) {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  // Trava o scroll do documento enquanto o sheet está aberto — o fundo não se
  // desloca e o foco permanece no menu.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="action-sheet"
          className="fixed inset-0 z-[140] flex h-[100dvh] w-full flex-col justify-end overflow-hidden transform-gpu will-change-transform"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
            {...backdropMotion}
          />

          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Ações'}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 42, mass: 0.9 }}
            className="gpu-layer relative mx-auto flex w-full max-w-app transform-gpu flex-col overflow-hidden rounded-t-[28px] border-t border-zinc-800/80 bg-zinc-950 pb-[max(1rem,env(safe-area-inset-bottom))] text-white shadow-[0_-24px_60px_rgba(0,0,0,0.55)]"
          >
            <span
              aria-hidden
              className="mx-auto mt-3 h-1.5 w-11 shrink-0 rounded-full bg-white/15"
            />

            {title || description ? (
              <header className="px-6 pt-4 text-center">
                {title ? (
                  <h2 className="text-[17px] font-semibold tracking-tight text-zinc-100">
                    {title}
                  </h2>
                ) : null}
                {description ? (
                  <p className="mt-1 text-[13px] leading-relaxed text-zinc-500">{description}</p>
                ) : null}
              </header>
            ) : null}

            <div className="mt-4 flex flex-col gap-2 px-3">
              {actions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  disabled={action.disabled}
                  onClick={action.onSelect}
                  className={cn(
                    'flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl border px-4 py-3.5 text-[15px] font-semibold transition-colors duration-200 active:scale-[0.99] disabled:opacity-40',
                    action.destructive
                      ? 'border-red-500/20 bg-red-500/[0.08] text-red-500 hover:bg-red-500/[0.12] active:bg-red-500/[0.16]'
                      : 'border-zinc-800/70 bg-zinc-900/60 text-zinc-100 hover:bg-zinc-900 active:bg-white/[0.06]'
                  )}
                >
                  {action.icon}
                  {action.label}
                </button>
              ))}
            </div>

            <div className="mt-3 px-3">
              <button
                type="button"
                onClick={onClose}
                className="flex min-h-14 w-full items-center justify-center rounded-2xl border border-zinc-800/70 bg-zinc-900/60 px-4 py-3.5 text-[15px] font-semibold text-zinc-400 transition-colors duration-200 hover:bg-zinc-900 active:bg-white/[0.06]"
              >
                {cancelLabel}
              </button>
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
