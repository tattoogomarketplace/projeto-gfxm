'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

/**
 * SIGNATURE TATTOO MACHINE GLYPH
 *
 * Ícone vetorial fine-line da máquina de tatuagem da marca. Fonte única de
 * verdade do grafismo — usado no gatilho do menu e como identidade "Low Profile"
 * universal para usuários sem foto de perfil. Os gradientes são escopados por
 * `useId`, garantindo determinismo mesmo com múltiplas instâncias na tela.
 */
export function TattooMachineGlyph({ className }: { className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const chassis = `tm-chassis-${uid}`;
  const coil = `tm-coil-${uid}`;
  const needle = `tm-needle-${uid}`;

  return (
    <svg viewBox="0 0 24 24" className={cn('h-6 w-6', className)} fill="none" aria-hidden>
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
