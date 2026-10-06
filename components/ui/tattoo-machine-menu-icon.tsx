'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';

export function TattooMachineMenuIcon({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, '');
  const maskId = `tm-menu-cut-${uid}`;

  return (
    <svg
      viewBox="0 0 24 24"
      className={cn('h-6 w-6', className)}
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <mask id={maskId}>
          <rect width="24" height="24" fill="white" />
          <rect x="3.2" y="7.05" width="17.6" height="1.7" rx="0.85" fill="black" />
          <rect x="3.2" y="11.15" width="17.6" height="1.7" rx="0.85" fill="black" />
          <rect x="3.2" y="15.25" width="17.6" height="1.7" rx="0.85" fill="black" />
        </mask>
      </defs>
      <g fill="currentColor" mask={`url(#${maskId})`}>
        <rect x="10.6" y="1.4" width="2.8" height="2.1" rx="0.45" />
        <path d="M7.05 4.05h9.9c.72 0 1.26.62 1.14 1.33l-.46 2.22H6.37l-.46-2.22c-.12-.71.42-1.33 1.14-1.33Z" />
        <circle cx="9.35" cy="11.15" r="3.15" />
        <circle cx="14.65" cy="11.15" r="3.15" />
        <rect x="11.15" y="8.05" width="1.7" height="6.35" rx="0.4" />
        <rect x="10.65" y="14.15" width="2.7" height="5.15" rx="0.7" />
        <path d="M12 19.1 12.75 22.7h-1.5Z" />
        <rect x="3.55" y="9.2" width="2.45" height="4.2" rx="0.7" />
      </g>
    </svg>
  );
}

type TattooMachineMenuTriggerProps = {
  open?: boolean;
  onClick: () => void;
};

export function TattooMachineMenuTrigger({ open = false, onClick }: TattooMachineMenuTriggerProps) {
  const { triggerHaptic } = useHapticFeedback();

  return (
    <button
      type="button"
      onClick={() => {
        triggerHaptic('light');
        onClick();
      }}
      aria-label="Abrir Configurações e atividade"
      aria-expanded={open}
      aria-haspopup="dialog"
      className={cn(
        'flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl',
        'text-zinc-400 transition-all duration-300 ease-out',
        'hover:bg-orange-500/10 hover:text-orange-500 hover:shadow-[0_0_18px_rgba(249,115,22,0.5)]',
        'active:scale-[0.96] active:text-orange-400 active:shadow-[0_0_22px_rgba(249,115,22,0.65)]',
        open && 'bg-orange-500/15 text-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.55)]'
      )}
    >
      <TattooMachineMenuIcon />
    </button>
  );
}
