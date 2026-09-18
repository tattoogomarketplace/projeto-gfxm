'use client';

import type { ReactNode } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { X } from 'lucide-react';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { shouldDismissFromPan, useNativeGestures } from '@/hooks/use-native-gestures';
import { cn } from '@/lib/utils';

interface NativeSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  className?: string;
  zIndexClassName?: string;
}

export function NativeSheet({
  open,
  onClose,
  children,
  title,
  className,
  zIndexClassName = 'z-[9999]',
}: NativeSheetProps) {
  const { triggerHaptic } = useHapticFeedback();
  const gestures = useNativeGestures(onClose, open);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (shouldDismissFromPan(info)) {
      triggerHaptic('light');
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={cn('fixed inset-0 flex items-end justify-center sm:items-center', zIndexClassName)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Fechar"
            className="absolute inset-0 min-h-11 bg-black/70 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Painel'}
            className={cn(
              'relative mb-0 w-full max-w-app overflow-hidden rounded-t-3xl border border-white/10 bg-[#1A1A1A]/92 p-5 shadow-2xl backdrop-blur-2xl',
              'sm:mb-8 sm:rounded-3xl touch-pan-y',
              className
            )}
            initial={{ y: 64, opacity: 0.85 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.08, bottom: 0.55 }}
            onDragEnd={handleDragEnd}
            {...gestures}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/25" />
            <div className="mb-4 flex min-h-11 items-center justify-between gap-3">
              <h2 className="text-[17px] font-semibold tracking-tight text-white">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Voltar"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white/8 text-zinc-300 active:scale-95"
              >
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
