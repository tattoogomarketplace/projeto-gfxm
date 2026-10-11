'use client';

import { memo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { Locale } from '@/lib/i18n/types';

function starPoints(cx: number, cy: number, outer: number, inner = outer * 0.382): string {
  const points: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    points.push(
      `${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`
    );
  }
  return points.join(' ');
}

const STAR_ZH_BIG = starPoints(10, 10, 5.6);
const STAR_ZH_1 = starPoints(17.5, 5, 2);
const STAR_ZH_2 = starPoints(20.5, 9.5, 2);
const STAR_ZH_3 = starPoints(20.5, 15, 2);
const STAR_ZH_4 = starPoints(17.5, 19.5, 2);
const STAR_TR = starPoints(23.5, 16, 3.4);
const STAR_AR = starPoints(24.5, 16, 3);

const FLAGS: Record<Locale, ReactNode> = {
  'pt-BR': (
    <>
      <rect width="32" height="32" fill="#009C3B" />
      <polygon points="16,3.5 29.5,16 16,28.5 2.5,16" fill="#FFDF00" />
      <circle cx="16" cy="16" r="6.2" fill="#002776" />
      <path d="M10.3 14.6a6.2 6.2 0 0 1 11.4 0" fill="none" stroke="#FFFFFF" strokeWidth="1.2" />
    </>
  ),
  'pt-PT': (
    <>
      <rect width="32" height="32" fill="#DA291C" />
      <rect width="12.8" height="32" fill="#046A38" />
      <circle cx="12.8" cy="16" r="6.4" fill="#FFE900" />
      <circle cx="12.8" cy="16" r="6.4" fill="none" stroke="#DA291C" strokeWidth="0.9" />
      <rect x="9.8" y="12" width="6" height="8" rx="1" fill="#FFFFFF" />
      <circle cx="12.8" cy="16" r="1.6" fill="#DA291C" />
    </>
  ),
  en: (
    <>
      <rect width="32" height="32" fill="#012169" />
      <path d="M0 0 32 32M32 0 0 32" stroke="#FFFFFF" strokeWidth="6" />
      <path d="M0 0 32 32M32 0 0 32" stroke="#C8102E" strokeWidth="3" />
      <rect x="13" width="6" height="32" fill="#FFFFFF" />
      <rect y="13" width="32" height="6" fill="#FFFFFF" />
      <rect x="14.5" width="3" height="32" fill="#C8102E" />
      <rect y="14.5" width="32" height="3" fill="#C8102E" />
    </>
  ),
  es: (
    <>
      <rect width="32" height="32" fill="#AA151B" />
      <rect y="8" width="32" height="16" fill="#F1BF00" />
    </>
  ),
  fr: (
    <>
      <rect width="32" height="32" fill="#FFFFFF" />
      <rect width="10.67" height="32" fill="#002395" />
      <rect x="21.33" width="10.67" height="32" fill="#ED2939" />
    </>
  ),
  de: (
    <>
      <rect width="32" height="32" fill="#000000" />
      <rect y="10.67" width="32" height="10.67" fill="#DD0000" />
      <rect y="21.33" width="32" height="10.67" fill="#FFCE00" />
    </>
  ),
  it: (
    <>
      <rect width="32" height="32" fill="#FFFFFF" />
      <rect width="10.67" height="32" fill="#009246" />
      <rect x="21.33" width="10.67" height="32" fill="#CE2B37" />
    </>
  ),
  ja: (
    <>
      <rect width="32" height="32" fill="#FFFFFF" />
      <circle cx="16" cy="16" r="8" fill="#BC002D" />
    </>
  ),
  zh: (
    <>
      <rect width="32" height="32" fill="#DE2910" />
      <polygon points={STAR_ZH_BIG} fill="#FFDE00" />
      <polygon points={STAR_ZH_1} fill="#FFDE00" />
      <polygon points={STAR_ZH_2} fill="#FFDE00" />
      <polygon points={STAR_ZH_3} fill="#FFDE00" />
      <polygon points={STAR_ZH_4} fill="#FFDE00" />
    </>
  ),
  ko: (
    <>
      <rect width="32" height="32" fill="#FFFFFF" />
      <circle cx="16" cy="16" r="7" fill="#0047A0" />
      <path
        d="M9 16a7 7 0 0 1 14 0 3.5 3.5 0 0 1-7 0 3.5 3.5 0 0 0-7 0Z"
        fill="#CD2E3A"
      />
    </>
  ),
  ar: (
    <>
      <rect width="32" height="32" fill="#006C35" />
      <circle cx="15" cy="16" r="8" fill="#FFFFFF" />
      <circle cx="18.8" cy="16" r="8" fill="#006C35" />
      <polygon points={STAR_AR} fill="#FFFFFF" />
    </>
  ),
  ru: (
    <>
      <rect width="32" height="32" fill="#FFFFFF" />
      <rect y="10.67" width="32" height="10.67" fill="#0039A6" />
      <rect y="21.33" width="32" height="10.67" fill="#D52B1E" />
    </>
  ),
  hi: (
    <>
      <rect width="32" height="32" fill="#FFFFFF" />
      <rect width="32" height="10.67" fill="#FF9933" />
      <rect y="21.33" width="32" height="10.67" fill="#138808" />
      <circle cx="16" cy="16" r="3.7" fill="none" stroke="#000080" strokeWidth="1" />
      <circle cx="16" cy="16" r="0.8" fill="#000080" />
    </>
  ),
  nl: (
    <>
      <rect width="32" height="32" fill="#FFFFFF" />
      <rect width="32" height="10.67" fill="#AE1C28" />
      <rect y="21.33" width="32" height="10.67" fill="#21468B" />
    </>
  ),
  tr: (
    <>
      <rect width="32" height="32" fill="#E30A17" />
      <circle cx="14" cy="16" r="7" fill="#FFFFFF" />
      <circle cx="16" cy="16" r="5.6" fill="#E30A17" />
      <polygon points={STAR_TR} fill="#FFFFFF" />
    </>
  ),
  pl: (
    <>
      <rect width="32" height="32" fill="#FFFFFF" />
      <rect y="16" width="32" height="16" fill="#DC143C" />
    </>
  ),
};

type LanguageFlagProps = {
  locale: Locale;
  className?: string;
};

export const LanguageFlag = memo(function LanguageFlag({ locale, className }: LanguageFlagProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative inline-flex aspect-square overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800',
        'transform-gpu backface-hidden',
        className
      )}
    >
      <svg
        viewBox="0 0 32 32"
        className="h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
        aria-hidden
      >
        {FLAGS[locale]}
      </svg>
      <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/25 via-transparent to-black/15" />
      <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-black/10 dark:ring-white/15" />
    </span>
  );
});
