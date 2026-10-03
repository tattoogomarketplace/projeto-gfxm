'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, X } from 'lucide-react';
import { TermsContent } from '@/components/shared/terms-content';

interface TermsViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal somente-leitura para consulta dos Termos de Uso e Política de
 * Privacidade a partir das Configurações do Perfil. Reaproveita o mesmo
 * conteúdo exibido no primeiro acesso.
 */
export function TermsViewerModal({ isOpen, onClose }: TermsViewerModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-9999 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label="Termos de Uso e Política de Privacidade"
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#121212] shadow-[0_0_40px_rgba(249,115,22,0.18)]"
          >
            <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
              <span className="flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-400">
                <FileText className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <h2 className="min-w-0 flex-1 truncate text-base font-bold text-white">
                Termos de Uso e Privacidade
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar termos"
                className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/10 text-zinc-400 transition-colors hover:border-orange-500/40 hover:text-orange-400 active:scale-95"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <TermsContent />
            </div>

            <div className="border-t border-white/10 px-5 py-4">
              <button
                type="button"
                onClick={onClose}
                className="min-h-11 w-full rounded-xl bg-orange-500 py-3 font-bold text-black transition-all hover:bg-orange-600 active:scale-95"
              >
                Entendi e fechar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
