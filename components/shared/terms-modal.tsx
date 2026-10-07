'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TermsContent } from '@/components/shared/terms-content';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void | Promise<void>;
}

export function TermsModal({ isOpen, onAccept }: TermsModalProps) {
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
          className="fixed inset-0 z-9999 flex h-[100dvh] max-h-[100dvh] items-center justify-center overflow-hidden bg-black/90 p-3 backdrop-blur-md sm:p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:max-h-[80dvh] sm:p-8"
          >
            <h2 className="mb-4 shrink-0 text-xl font-bold text-amber-500 sm:text-2xl">Termos de Uso Obrigatórios</h2>
            <div
            className="mb-5 min-h-0 flex-1 overflow-y-auto overscroll-contain border-b border-zinc-800 pb-4 text-sm text-zinc-400 [-webkit-overflow-scrolling:touch]"
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
                {isAccepting ? 'Processando...' : canAccept ? 'Aceito os Termos' : 'Leia até o final para aceitar'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

