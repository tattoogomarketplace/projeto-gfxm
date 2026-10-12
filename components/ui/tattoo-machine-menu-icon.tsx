'use client';

import { useId } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { useUiStore } from '@/hooks/use-ui-store';

const ICON_SPRING = { type: 'spring' as const, stiffness: 460, damping: 30, mass: 0.8 };

function TattooMachineGlyph() {
  const uid = useId().replace(/:/g, '');
  const chassis = `tm-chassis-${uid}`;
  const coil = `tm-coil-${uid}`;
  const needle = `tm-needle-${uid}`;

  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden>
      <defs>
        <linearGradient id={chassis} x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3f3f46" />
          <stop offset="42%" stopColor="#27272a" />
          <stop offset="100%" stopColor="#18181b" />
        </linearGradient>
        <linearGradient id={coil} x1="0" y1="7.5" x2="0" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="48%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
        <linearGradient id={needle} x1="0" y1="13.7" x2="0" y2="23" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
      </defs>

      <rect x="8.9" y="1.5" width="6.2" height="2.4" rx="0.9" fill={`url(#${chassis})`} />
      <rect x="10.9" y="0.6" width="2.2" height="1.4" rx="0.5" fill={`url(#${chassis})`} />

      <rect x="8.2" y="3.5" width="1.9" height="2.3" rx="0.6" fill={`url(#${chassis})`} />
      <rect x="13.9" y="3.5" width="1.9" height="2.3" rx="0.6" fill={`url(#${chassis})`} />

      <rect x="3.5" y="8.5" width="2.5" height="4.7" rx="0.9" fill={`url(#${chassis})`} />
      <rect x="4.4" y="9.6" width="0.6" height="2.6" rx="0.3" fill="#18181b" opacity="0.7" />

      <circle cx="9.7" cy="10.7" r="3.15" fill={`url(#${coil})`} />
      <circle cx="14.3" cy="10.7" r="3.15" fill={`url(#${coil})`} />
      <circle cx="9.7" cy="10.7" r="1.55" fill="#18181b" opacity="0.55" />
      <circle cx="14.3" cy="10.7" r="1.55" fill="#18181b" opacity="0.55" />
      <circle cx="9.15" cy="9.85" r="0.7" fill="#fb923c" opacity="0.7" />
      <circle cx="13.75" cy="9.85" r="0.7" fill="#fb923c" opacity="0.7" />

      <path
        d="M7 9.3c1.4-.9 3-.9 4.4 0M6.7 11.5c1.5-.9 3.2-.9 4.7 0"
        stroke="#ea580c"
        strokeWidth="0.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M11.9 9.3c1.4-.9 3-.9 4.4 0M12.2 11.5c1.5-.9 3.2-.9 4.7 0"
        stroke="#ea580c"
        strokeWidth="0.5"
        fill="none"
        strokeLinecap="round"
      />

      <rect x="11.15" y="7.4" width="1.7" height="6.8" rx="0.5" fill={`url(#${chassis})`} />

      <path
        d="M6 10.7h1.2M16.8 10.7H18"
        stroke={`url(#${chassis})`}
        strokeWidth="1.4"
        strokeLinecap="round"
      />

      <rect x="10.1" y="13.7" width="3.8" height="1" rx="0.5" fill={`url(#${needle})`} />
      <rect x="10.45" y="14" width="3.1" height="5.5" rx="1.1" fill={`url(#${needle})`} />
      <rect x="11.25" y="14.7" width="0.55" height="4.1" rx="0.28" fill="#a7f3d0" opacity="0.45" />

      <path d="M12 19.35 12.75 22.9h-1.5z" fill={`url(#${needle})`} />
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
