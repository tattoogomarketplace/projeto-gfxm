'use client';

import { memo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useToastStore, type ToastItem, type ToastType } from '@/lib/toast';
import { cn } from '@/lib/utils';

const ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const ACCENTS: Record<ToastType, { icon: string; badge: string; border: string; glow: string; bar: string }> = {
  success: {
    icon: 'text-emerald-500 dark:text-emerald-400',
    badge: 'bg-emerald-500/10 dark:bg-emerald-400/10',
    border: 'border-emerald-500/30 dark:border-emerald-400/25',
    glow: 'shadow-[0_16px_44px_rgba(16,185,129,0.18)]',
    bar: '#10B981',
  },
  error: {
    icon: 'text-red-500 dark:text-red-400',
    badge: 'bg-red-500/10 dark:bg-red-400/10',
    border: 'border-red-500/30 dark:border-red-400/25',
    glow: 'shadow-[0_16px_44px_rgba(239,68,68,0.18)]',
    bar: '#EF4444',
  },
  warning: {
    icon: 'text-amber-500 dark:text-amber-400',
    badge: 'bg-amber-500/10 dark:bg-amber-400/10',
    border: 'border-amber-500/30 dark:border-amber-400/25',
    glow: 'shadow-[0_16px_44px_rgba(245,158,11,0.18)]',
    bar: '#F59E0B',
  },
  info: {
    icon: 'text-[#F97316] dark:text-orange-400',
    badge: 'bg-[#F97316]/10 dark:bg-orange-400/10',
    border: 'border-[#F97316]/30 dark:border-orange-400/25',
    glow: 'shadow-[0_16px_44px_rgba(249,115,22,0.18)]',
    bar: '#F97316',
  },
};

const ToastCard = memo(function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const Icon = ICONS[item.type];
  const accent = ACCENTS[item.type];

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -14, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.8 }}
      className={cn(
        'pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-2xl border px-4 py-3',
        'transform-gpu backface-hidden will-change-transform',
        'bg-white/85 backdrop-blur-xl dark:bg-[#161616]/85',
        accent.border,
        accent.glow
      )}
      role="status"
    >
      <span
        className={cn(
          'mt-0.5 flex h-9 w-9 min-h-9 min-w-9 shrink-0 items-center justify-center rounded-xl',
          accent.badge,
          accent.icon
        )}
        aria-hidden
      >
        <Icon className="h-5 w-5" strokeWidth={1.9} />
      </span>

      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm font-semibold leading-snug tracking-tight text-neutral-900 dark:text-white">
          {item.title}
        </p>
        {item.description ? (
          <p className="mt-0.5 text-xs leading-relaxed text-neutral-600 dark:text-zinc-400">
            {item.description}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="Fechar notificação"
        className={cn(
          'mt-0.5 flex h-8 w-8 min-h-8 min-w-8 shrink-0 items-center justify-center rounded-lg',
          'text-neutral-400 transition-colors duration-200 hover:bg-neutral-900/5 hover:text-neutral-700',
          'active:scale-90 dark:text-zinc-500 dark:hover:bg-white/10 dark:hover:text-zinc-200'
        )}
      >
        <X className="h-4 w-4" strokeWidth={2} />
      </button>

      {item.duration > 0 ? (
        <motion.span
          aria-hidden
          className="absolute bottom-0 left-0 h-[2px] w-full origin-left"
          style={{ backgroundColor: accent.bar }}
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: item.duration / 1000, ease: 'linear' }}
        />
      ) : null}
    </motion.li>
  );
});

export const ToastContainer = memo(function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  const handleDismiss = useCallback((id: string) => dismiss(id), [dismiss]);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex justify-center px-4 pt-[max(0.75rem,env(safe-area-inset-top))]"
      aria-live="polite"
      aria-atomic="false"
    >
      <ul className="flex w-full max-w-sm flex-col gap-2">
        <AnimatePresence initial={false}>
          {toasts.map((item) => (
            <ToastCard key={item.id} item={item} onDismiss={handleDismiss} />
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
});
