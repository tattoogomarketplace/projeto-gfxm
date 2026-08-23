'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TERMS_TEXT } from '@/lib/terms';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export function TermsModal({ isOpen, onClose, onAccept }: TermsModalProps) {
  const [canAccept, setCanAccept] = useState(false);
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-9999 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          >
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
                disabled={!canAccept}
                onClick={onAccept}
                className={`flex-1 font-bold py-3 rounded-xl transition-all ${
                  canAccept 
                    ? 'bg-amber-500 hover:bg-amber-600 text-black' 
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                }`}
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

