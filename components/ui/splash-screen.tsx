'use client';

import { useState } from 'react';
import Image from 'next/image';
import { BRAND_NAME } from '@/lib/i18n/brands';

/**
 * Splash tier "Apple": fundo preto sólido, logo da máquina 3D no centro exato e
 * assinatura de marca ancorada na base respeitando a safe-area inferior.
 *
 * Regra de marca (não traduzir/alterar): "TattooGo" em branco + "MK" no cobre
 * extraído do ícone do app (#D9460E).
 */

const MACHINE_LOGO_SRC = '/assets/maquina-logo.png';

const WORDMARK_PARTS = BRAND_NAME.split(' ');
const WORDMARK_MAIN = WORDMARK_PARTS[0] ?? BRAND_NAME;
const WORDMARK_MARK = WORDMARK_PARTS.slice(1).join(' ') || 'MK';

function MachineMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="tattoogo-splash-copper"
          x1="4"
          y1="1"
          x2="20"
          y2="23"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#F05000" />
          <stop offset="48%" stopColor="#D9460E" />
          <stop offset="100%" stopColor="#B8430F" />
        </linearGradient>
      </defs>
      <g fill="url(#tattoogo-splash-copper)">
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

function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="text-white">{WORDMARK_MAIN}</span>
      <span className="ml-1 text-brand-copper [text-shadow:0_0_20px_rgba(217,70,14,0.45)]">
        {WORDMARK_MARK}
      </span>
    </span>
  );
}

export function SplashScreen() {
  const [machineFailed, setMachineFailed] = useState(false);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={BRAND_NAME}
      style={{ backgroundColor: '#000000' }}
      className="splash-gpu splash-enter fixed inset-0 z-[9999] flex h-[100dvh] w-full flex-col items-center justify-between overflow-hidden bg-black pt-[env(safe-area-inset-top)]"
    >
      <div aria-hidden className="w-full flex-1" />

      <div className="flex w-full shrink-0 flex-col items-center gap-5 px-6">
        <div className="relative flex items-center justify-center">
          <div
            aria-hidden
            className="splash-gpu splash-glow pointer-events-none absolute h-40 w-40 rounded-full bg-brand-copper/30 blur-[54px] sm:h-48 sm:w-48"
          />
          {machineFailed ? (
            <MachineMark className="splash-gpu splash-icon-enter relative h-40 w-40 drop-shadow-[0_0_44px_rgba(217,70,14,0.35)] sm:h-48 sm:w-48" />
          ) : (
            <Image
              src={MACHINE_LOGO_SRC}
              alt={BRAND_NAME}
              width={208}
              height={208}
              priority
              onError={() => setMachineFailed(true)}
              className="splash-gpu splash-icon-enter relative h-40 w-40 object-contain drop-shadow-[0_0_44px_rgba(217,70,14,0.35)] sm:h-48 sm:w-48"
            />
          )}
        </div>

        <Wordmark className="splash-gpu text-[2rem] font-extrabold leading-none tracking-tight sm:text-4xl" />
      </div>

      <div aria-hidden className="w-full flex-1" />

      <footer className="flex w-full shrink-0 flex-col items-center pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <span className="text-xs uppercase tracking-widest text-zinc-500">from</span>
        <Wordmark className="mt-1 text-sm font-semibold tracking-wide" />
      </footer>
    </div>
  );
}
