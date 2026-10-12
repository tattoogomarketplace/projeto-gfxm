'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';

const ICON_SPRING = { type: 'spring' as const, stiffness: 460, damping: 30, mass: 0.8 };

function TattooMachineGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <rect x="3" y="8" width="7.5" height="9" rx="1.8" fill="#1A1A1A" />
      <path
        d="M4.2 9.1c0-.4.3-.7.7-.7h.6c.3 0 .5.3.4.6l-.5 2.2c-.1.3-.4.5-.7.5H4.4c-.4 0-.6-.4-.5-.7Z"
        fill="#FF6600"
        opacity="0.92"
      />
      <rect
        x="5.6"
        y="9"
        width="4"
        height="3.2"
        rx="0.7"
        fill="#262626"
        stroke="#1F9C67"
        strokeWidth="0.85"
      />
      <rect
        x="5.6"
        y="12.8"
        width="4"
        height="3.2"
        rx="0.7"
        fill="#262626"
        stroke="#1F9C67"
        strokeWidth="0.85"
      />
      <path
        d="M4.4 8.2c2.2-2.6 6.2-3.2 8.6-1.1l2.6 2.3"
        stroke="#1F9C67"
        strokeWidth="1.35"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="13.2" cy="9.6" r="1.05" fill="#FF6600" />
      <circle cx="13.2" cy="9.6" r="0.4" fill="#1A1A1A" />
      <path d="M10.4 11.2h5.2" stroke="#1F9C67" strokeWidth="1.3" strokeLinecap="round" />
      <rect
        x="14.6"
        y="10"
        width="5"
        height="3.2"
        rx="1.4"
        fill="#1A1A1A"
        stroke="#1F9C67"
        strokeWidth="0.7"
      />
      <path d="M19.4 11.6h3.2" stroke="#1F9C67" strokeWidth="1.15" strokeLinecap="round" />
      <circle cx="22.5" cy="11.6" r="0.7" fill="#FF6600" />
      <path d="M7.6 17.8v2.2" stroke="#1F9C67" strokeWidth="1.1" strokeLinecap="round" />
      <circle cx="7.6" cy="20.4" r="0.7" fill="#FF6600" />
    </svg>
  );
}

type TattooMachineMenuTriggerProps = {
  open?: boolean;
  onClick: () => void;
};

export function TattooMachineMenuTrigger({ open = false, onClick }: TattooMachineMenuTriggerProps) {
  const { triggerHaptic } = useHapticFeedback();
  const { t } = useI18n();

  return (
    <motion.button
      type="button"
      onClick={() => {
        triggerHaptic('light');
        onClick();
      }}
      aria-label={t('profile.settingsAndActivity')}
      aria-expanded={open}
      aria-haspopup="dialog"
      className={cn(
        'relative flex h-11 w-11 min-h-11 min-w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl',
        'text-zinc-400 transition-colors duration-200 ease-out',
        'hover:bg-white/[0.05] hover:text-zinc-100',
        'active:bg-orange-500/10 active:text-orange-400',
        open && 'bg-orange-500/15 text-orange-400'
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
            <TattooMachineGlyph />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
