'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { useUiStore } from '@/hooks/use-ui-store';
import { TattooMachineGlyph } from '@/components/ui/tattoo-machine-glyph';

const ICON_SPRING = { type: 'spring' as const, stiffness: 460, damping: 30, mass: 0.8 };

type TattooMachineMenuTriggerProps = {
  open?: boolean;
  onClick: () => void;
};

export function TattooMachineMenuTrigger({ open = false, onClick }: TattooMachineMenuTriggerProps) {
  const { triggerHaptic } = useHapticFeedback();
  const { t } = useI18n();
  const locked = useUiStore((s) => s.settingsDrawerBusy);

  const handleClick = () => {
    if (locked) return;
    triggerHaptic('light');
    onClick();
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      aria-disabled={locked}
      style={locked ? { pointerEvents: 'none' } : undefined}
      aria-label={t('profile.settingsAndActivity')}
      aria-expanded={open}
      aria-haspopup="dialog"
      className={cn(
        'relative flex h-11 w-11 min-h-11 min-w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl',
        'text-zinc-400 transition-colors duration-200 ease-out',
        'hover:bg-white/[0.05] hover:text-zinc-100',
        'active:bg-orange-500/10 active:text-orange-400',
        open && 'bg-orange-500/15 text-orange-400',
        locked && 'pointer-events-none'
      )}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 520, damping: 32 }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {open ? (
          <motion.span
            key="gear"
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, rotate: -90, scale: 0.55 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.55 }}
            transition={ICON_SPRING}
          >
            <Settings className="h-5 w-5" strokeWidth={1.75} />
          </motion.span>
        ) : (
          <motion.span
            key="machine"
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, rotate: 90, scale: 0.55 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: -90, scale: 0.55 }}
            transition={ICON_SPRING}
          >
            <span className="relative flex h-8 w-8 min-h-8 min-w-8 items-center justify-center overflow-hidden rounded-[10px] border border-white/[0.06] bg-zinc-950">
              <span className="pointer-events-none absolute -left-1.5 -top-1.5 h-5 w-5 rounded-full bg-orange-500/30 blur-md" />
              <span className="pointer-events-none absolute -bottom-1.5 -right-1.5 h-5 w-5 rounded-full bg-emerald-400/30 blur-md" />
              <span className="relative z-10 flex items-center justify-center">
                <TattooMachineGlyph />
              </span>
            </span>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
