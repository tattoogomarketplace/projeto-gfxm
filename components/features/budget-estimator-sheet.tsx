'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';

const subscribe = () => () => {};

type BudgetEstimatorSheetProps = {
  open: boolean;
  onClose: () => void;
};

export function BudgetEstimatorSheet({ open, onClose }: BudgetEstimatorSheetProps) {
  const { t } = useI18n();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

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
          key="budget-estimator-sheet"
          className="fixed inset-0 z-[9998] flex items-end justify-center bg-black/60 backdrop-blur-sm transition-opacity"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="budget-estimator-title"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 42, mass: 0.9 }}
            onClick={(event) => event.stopPropagation()}
            className="relative w-full max-w-2xl rounded-t-[32px] border-t border-white/10 bg-[#0a0a0c] p-6 pb-[max(2.5rem,calc(2.5rem+env(safe-area-inset-bottom)))] shadow-2xl"
          >
            <span
              aria-hidden
              className="mx-auto mb-6 block h-1.5 w-12 rounded-full bg-white/20"
            />

            <header className="mb-6 flex items-center justify-between gap-3">
              <h2
                id="budget-estimator-title"
                className="text-[17px] font-semibold tracking-tight text-zinc-100"
              >
                Análise de Orçamento
              </h2>
              <button
                type="button"
                aria-label={t('common.close')}
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-400 transition-all hover:bg-white/10 hover:text-white"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </header>

            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1">
                <dt className="text-sm text-zinc-400">Estilo</dt>
                <dd className="font-medium text-white">Realismo</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-sm text-zinc-400">Localização</dt>
                <dd className="font-medium text-white">São Paulo/SP</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-sm text-zinc-400">Artista</dt>
                <dd className="font-medium text-white">Rafael Lima</dd>
              </div>
            </dl>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
