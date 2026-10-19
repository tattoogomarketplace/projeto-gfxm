'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { TermsContent } from '@/components/shared/terms-content';
import { useI18n } from '@/hooks/use-i18n';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void | Promise<void>;
}

export function TermsModal({ isOpen, onClose, onAccept }: TermsModalProps) {
  const { t } = useI18n();
  const [canAccept, setCanAccept] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  const handleAccept = async () => {
    if (isAccepting || !canAccept) return;
    setIsAccepting(true);
    try {
      await Promise.resolve(onAccept());
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex h-[100dvh] max-h-[100dvh] items-center justify-center overflow-hidden bg-black/90 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] backdrop-blur-md sm:px-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:max-h-[80dvh] sm:p-8"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label={t('terms.closeAria')}
              className="pointer-events-auto absolute top-4 right-4 z-[9999] flex h-11 w-11 min-h-11 min-w-11 cursor-pointer touch-manipulation items-center justify-center rounded-full p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white active:scale-95"
            >
              <X className="h-5 w-5" strokeWidth={1.75} />
            </button>
            <h2 className="mb-4 shrink-0 pr-12 text-xl font-bold text-amber-500 sm:text-2xl">{t('terms.requiredTitle')}</h2>
            <div
            className="mb-5 min-h-0 flex-1 overflow-y-auto overscroll-contain border-b border-zinc-800 pb-[calc(env(safe-area-inset-bottom)+5rem)] text-sm text-zinc-400 [-webkit-overflow-scrolling:touch]"
            onScroll={(e) => {
              const target = e.target as HTMLDivElement;
              if (target.scrollHeight - target.scrollTop <= target.clientHeight + 10) {
                setCanAccept(true);
              }
            }}
          >
            <TermsContent />
          </div>
            <div className="flex shrink-0 gap-4">
              <button
                type="button"
                disabled={!canAccept || isAccepting}
                onClick={handleAccept}
                className={`min-h-11 flex-1 rounded-xl py-3 text-sm font-bold leading-snug transition-all sm:text-base ${
                  canAccept && !isAccepting
                    ? 'bg-amber-500 hover:bg-amber-600 text-black' 
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                }`}
              >
                {isAccepting ? t('common.loading') : canAccept ? t('terms.accept') : t('terms.readToEnd')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

