'use client';

import { useEffect, useSyncExternalStore, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ImagePlus } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { PORTFOLIO_BODY_PARTS, portfolioLabelResolver } from '@/lib/portfolio-metadata';

const subscribe = () => () => {};

const backdropMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
} as const;

export type QuoteRequestSheetProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: { bodyPart: string; estimatedSize: string }) => void;
};

export function QuoteRequestSheet({ open, onClose, onSubmit }: QuoteRequestSheetProps) {
  const { t } = useI18n();
  const { bodyPartLabel } = portfolioLabelResolver(t);
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const bodyPart = String(data.get('bodyPart') ?? '').trim();
    const estimatedSize = String(data.get('estimatedSize') ?? '').trim();
    onSubmit({ bodyPart, estimatedSize });
  };

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="quote-request-sheet"
          className="fixed inset-0 z-[140] flex h-[100dvh] w-full flex-col justify-end overflow-hidden transform-gpu will-change-transform"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.button
            type="button"
            aria-label={t('common.back')}
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
            {...backdropMotion}
          />

          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label={t('vitrine.requestQuote')}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 42, mass: 0.9 }}
            className="gpu-layer relative mx-auto flex w-full max-w-app transform-gpu flex-col overflow-hidden rounded-t-[28px] border-t border-zinc-800/80 bg-zinc-950 p-6 pb-[max(env(safe-area-inset-bottom),_1.5rem)] text-white shadow-[0_-24px_60px_rgba(0,0,0,0.55)]"
          >
            <span
              aria-hidden
              className="mx-auto h-1.5 w-12 shrink-0 rounded-full bg-zinc-700"
            />

            <header className="pt-4 text-center">
              <h2 className="text-[17px] font-semibold tracking-tight text-zinc-100">
                {t('vitrine.requestQuote')}
              </h2>
            </header>

            <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit}>
              <label className="flex flex-col gap-2">
                <span className="text-[12px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                  {t('portfolio.bodyPart')}
                </span>
                <select
                  name="bodyPart"
                  defaultValue=""
                  className="min-h-12 w-full appearance-none rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 text-[15px] text-zinc-100 outline-none focus:border-orange-500/50"
                >
                  <option value="" disabled>
                    {t('portfolio.bodyPart')}
                  </option>
                  {PORTFOLIO_BODY_PARTS.map((part) => (
                    <option key={part} value={part}>
                      {bodyPartLabel(part)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[12px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                  {t('vitrine.estimatedSize')}
                </span>
                <input
                  name="estimatedSize"
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  placeholder={t('vitrine.estimatedSizePlaceholder')}
                  className="min-h-12 w-full rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 text-[15px] text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-orange-500/50"
                />
              </label>

              <div className="flex flex-col gap-2">
                <span className="text-[12px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                  {t('vitrine.referenceImage')}
                </span>
                <div className="flex min-h-[8.5rem] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/40">
                  <ImagePlus className="mb-2 h-6 w-6 text-zinc-500" strokeWidth={1.75} />
                  <span className="text-sm font-medium text-zinc-500">
                    {t('vitrine.referenceImage')}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="mt-2 flex min-h-12 w-full items-center justify-center rounded-2xl bg-orange-500 px-4 text-[15px] font-semibold text-white transition-transform active:scale-[0.98]"
              >
                {t('vitrine.sendToArtist')}
              </button>
            </form>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
