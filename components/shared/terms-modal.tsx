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
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-zinc-950 border border-zinc-800 p-8 rounded-3xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          >
            <h2 className="text-2xl font-bold text-white mb-4">Termos de Uso</h2>
            <pre className="text-zinc-400 text-sm whitespace-pre-wrap font-sans mb-8">
              {TERMS_TEXT}
            </pre>
            <div className="flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 py-3 text-zinc-400 hover:text-white transition-colors"
              >
                Recusar
              </button>
              <button
                onClick={onAccept}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-black font-bold py-3 rounded-xl transition-all"
              >
                Aceito os Termos
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

