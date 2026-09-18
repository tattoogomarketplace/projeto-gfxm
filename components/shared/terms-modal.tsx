'use client';

import { useState } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { TERMS_TEXT } from '@/lib/terms';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { shouldDismissFromPan, useNativeGestures } from '@/hooks/use-native-gestures';
import { cn } from '@/lib/utils';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export function TermsModal({ isOpen, onClose, onAccept }: TermsModalProps) {
  const [canAccept, setCanAccept] = useState(false);
  const { triggerHaptic } = useHapticFeedback();
  const gestures = useNativeGestures(onClose, isOpen);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (shouldDismissFromPan(info)) {
      triggerHaptic('light');
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-9999 bg-black/90 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
          {...gestures}
        >
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 90, opacity: 0 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.08, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            className="bg-zinc-900 border border-zinc-800 p-6 sm:p-8 rounded-t-3xl sm:rounded-3xl max-w-2xl w-full max-h-[86vh] overflow-hidden"
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/25 sm:hidden" />
            <h2 className="text-2xl font-bold text-amber-500 mb-4">Termos de Uso Obrigatórios</h2>
            <div
              className="text-zinc-400 text-sm mb-8 h-64 overflow-y-auto border-b border-zinc-800 pb-4"
              onScroll={(e) => {
                const target = e.target as HTMLDivElement;
                if (target.scrollHeight - target.scrollTop <= target.clientHeight + 10) {
                  setCanAccept(true);
                }
              }}
            >
              {TERMS_TEXT}
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={onClose}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-zinc-400"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={!canAccept}
                onClick={() => {
                  triggerHaptic('success');
                  onAccept();
                }}
                className={cn(
                  'flex-1 min-h-11 font-bold py-3 rounded-xl transition-all',
                  canAccept
                    ? 'bg-amber-500 hover:bg-amber-600 text-black'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                )}
              >
                {canAccept ? 'Aceito os Termos' : 'Leia até o final para aceitar'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
