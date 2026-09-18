'use client';

import { motion } from 'framer-motion';
import { getPasswordStrength } from '@/lib/utils/password-strength';
import { cn } from '@/lib/utils';

type PasswordStrengthBarProps = {
  password: string;
};

function TattooMachineGlyph({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 36 36" className="h-8 w-8 drop-shadow-[0_0_8px_rgba(249,115,22,0.45)]" aria-hidden>
      <rect x="8" y="6" width="16" height="12" rx="2.5" fill="#1a1a1a" stroke="#F97316" strokeWidth="1.6" />
      <rect x="11" y="9" width="4" height="6" rx="1" fill="#F97316" opacity={active ? 1 : 0.45} />
      <rect x="17" y="9" width="4" height="6" rx="1" fill="#F97316" opacity={active ? 1 : 0.45} />
      <rect x="16" y="18" width="4" height="7" rx="1" fill="#F97316" />
      <path d="M18 25 v6" stroke="#FDBA74" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="18" cy="32" r="1.3" fill="#F97316" />
      <path d="M24 10 h5" stroke="#F97316" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

const TONE_TEXT = {
  muted: 'text-zinc-500',
  red: 'text-red-500',
  yellow: 'text-amber-400',
  orange: 'text-orange-500',
  green: 'text-orange-400',
};

const TONE_INK = {
  muted: 'bg-zinc-700',
  red: 'bg-red-500',
  yellow: 'bg-amber-400',
  orange: 'bg-orange-500',
  green: 'bg-orange-500 shadow-[0_0_14px_rgba(249,115,22,0.55)]',
};

export function PasswordStrengthBar({ password }: PasswordStrengthBarProps) {
  const strength = getPasswordStrength(password);
  const active = strength.score > 0;

  return (
    <div className="space-y-2" aria-live="polite">
      <div className="relative h-10">
        <div className="absolute inset-x-1 top-[22px] h-[3px] overflow-hidden rounded-full bg-zinc-800">
          <motion.div
            className={cn('h-full rounded-full', TONE_INK[strength.tone])}
            initial={false}
            animate={{ width: `${strength.percent}%` }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          />
        </div>
        <motion.div
          className={cn(
            'absolute top-0 z-10 -ml-4',
            active && 'tattoo-machine-buzz'
          )}
          initial={false}
          animate={{ left: `${strength.percent}%` }}
          transition={{ type: 'spring', stiffness: 240, damping: 26 }}
        >
          <TattooMachineGlyph active={active} />
        </motion.div>
      </div>
      <div className="flex items-center justify-between">
        <p
          className={cn(
            'text-[11px] font-bold uppercase tracking-[0.16em]',
            TONE_TEXT[strength.tone],
            strength.isComplete && 'text-orange-400'
          )}
        >
          {strength.label}
        </p>
        <p className="text-[10px] text-zinc-600">{strength.score}/5</p>
      </div>
      <ul className="grid grid-cols-2 gap-1">
        {strength.checks.map((check) => (
          <li
            key={check.id}
            className={cn(
              'text-[10px] tracking-wide',
              check.passed ? 'text-orange-400' : 'text-zinc-600'
            )}
          >
            {check.passed ? '+' : '-'} {check.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
