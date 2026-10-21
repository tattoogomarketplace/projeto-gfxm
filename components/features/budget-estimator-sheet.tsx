'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Search, Sparkles, X } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';

const subscribe = () => () => {};

const sheetSpring = { type: 'spring', damping: 25, stiffness: 200 } as const;

type BudgetEstimatorSheetProps = {
  open: boolean;
  onClose: () => void;
  onRequestQuote: () => void;
};

export function BudgetEstimatorSheet({
  open,
  onClose,
  onRequestQuote,
}: BudgetEstimatorSheetProps) {
  const { t } = useI18n();
  const [showCheaperOptions, setShowCheaperOptions] = useState(false);
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
      if (event.key !== 'Escape') return;
      if (showCheaperOptions) {
        setShowCheaperOptions(false);
        return;
      }
      setShowCheaperOptions(false);
      onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, showCheaperOptions]);

  if (!mounted) return null;

  return createPortal(
    <>
      <AnimatePresence>
        {open ? (
          <motion.div
            key="budget-estimator-root"
            className="fixed inset-0 z-[9998] flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              aria-hidden
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowCheaperOptions(false);
                onClose();
              }}
            />
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="budget-estimator-title"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={sheetSpring}
              onClick={(event) => event.stopPropagation()}
              className="relative w-full max-w-2xl transform-gpu rounded-t-[32px] border-t border-white/10 bg-[#0a0a0c] p-6 pb-[max(2.5rem,calc(2.5rem+env(safe-area-inset-bottom)))] shadow-2xl will-change-transform"
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
                  onClick={() => {
                    setShowCheaperOptions(false);
                    onClose();
                  }}
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

              <div className="relative mt-6 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 p-5 shadow-inner">
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-orange-500/50 to-transparent"
                />
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="size-4 text-orange-500" />
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-orange-500">
                    Estimativa Inteligente IA
                  </h4>
                </div>
                <p className="mb-5 text-[13px] leading-relaxed text-zinc-400">
                  Nossa inteligência artificial analisou o mercado para este estilo e região. Este é um cálculo simulado para te dar previsibilidade financeira antes de solicitar o orçamento final ao artista.
                </p>
                <div className="flex flex-col items-center justify-center rounded-xl border border-white/5 bg-black/40 p-4">
                  <span className="mb-1 text-xs uppercase tracking-wider text-zinc-500">
                    Média de mercado
                  </span>
                  <span className="text-3xl font-bold tracking-tight text-white">
                    R$ 800 - R$ 1.200
                  </span>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={onRequestQuote}
                  className="flex w-full items-center justify-center rounded-xl bg-orange-500 py-3.5 text-[14px] font-bold tracking-wide text-black transition-all hover:bg-orange-400 active:scale-[0.98]"
                >
                  Solicitar Orçamento Oficial
                </button>
                <div className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-white/10 via-orange-500/30 to-white/10 p-[1px] transition-all hover:from-white/20 hover:via-orange-500/50 hover:to-white/20">
                  <button
                    type="button"
                    onClick={() => setShowCheaperOptions(true)}
                    className="relative flex w-full items-center justify-center gap-2 rounded-xl bg-[#0a0a0c] py-3.5 text-[14px] font-medium text-zinc-300 transition-all group-hover:bg-zinc-900 active:scale-[0.98]"
                  >
                    <Search size={16} className="text-orange-500" />
                    Encontrar opções mais acessíveis
                  </button>
                </div>
              </div>
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {open && showCheaperOptions ? (
          <motion.div
            key="cheaper-alternatives"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cheaper-alternatives-title"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={sheetSpring}
            className="fixed inset-0 z-[9999] flex h-[100dvh] w-full flex-col bg-[#0a0a0c] transform-gpu will-change-transform"
          >
            <header className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
              <button
                type="button"
                onClick={() => setShowCheaperOptions(false)}
                aria-label={t('common.back')}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-300 transition-all hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft size={18} strokeWidth={2} />
              </button>
              <h2
                id="cheaper-alternatives-title"
                className="min-w-0 flex-1 text-[17px] font-semibold tracking-tight text-zinc-100"
              >
                Opções Acessíveis
              </h2>
              <Sparkles className="size-4 shrink-0 text-orange-500" />
            </header>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              {/* Artist Cards will go here */}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>,
    document.body
  );
}
