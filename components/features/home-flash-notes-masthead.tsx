'use client';

import Image from 'next/image';
import { Great_Vibes } from 'next/font/google';
import { BRAND_NAME, BRAND_WORDMARK } from '@/lib/i18n/brands';
import { useI18n } from '@/hooks/use-i18n';
import { NATIVE_APP_IMAGE_STYLE } from '@/components/ui/optimized-image';

const brandScript = Great_Vibes({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
});

const MOCK_FLASH_NOTES = [
  {
    id: 'flash-marina',
    name: 'Marina',
    imageUrl:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=240&q=80&auto=format&fit=crop',
  },
  {
    id: 'flash-rafael',
    name: 'Rafael',
    imageUrl:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&q=80&auto=format&fit=crop',
  },
  {
    id: 'flash-bianca',
    name: 'Bianca',
    imageUrl:
      'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=240&q=80&auto=format&fit=crop',
  },
] as const;

export function HomeFlashNotesMasthead() {
  const { t } = useI18n();

  return (
    <div className="-mx-4 min-w-0 sm:-mx-6">
      <div className="relative flex w-full justify-center bg-transparent px-14 pb-2 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <p
          className={`${brandScript.className} select-none text-[clamp(2.15rem,8vw,2.85rem)] leading-none tracking-tight`}
          aria-label={BRAND_NAME}
        >
          <span className="text-white">{BRAND_WORDMARK.main}</span>
          <span className="text-[#FF5F1F] [text-shadow:0_0_18px_rgba(255,95,31,0.45)]">
            {' '}
            {BRAND_WORDMARK.mark}
          </span>
        </p>
      </div>

      <div className="sticky top-0 z-50 w-full transform-gpu border-b border-white/5 bg-[#121212]/80 pb-3 pt-[max(env(safe-area-inset-top),0.5rem)] backdrop-blur-2xl will-change-transform [backface-visibility:hidden] [transform:translateZ(0)]">
        <div
          className="hide-scrollbar flex gap-4 overflow-x-auto overscroll-x-contain snap-x snap-mandatory px-4 pr-16 [-webkit-overflow-scrolling:touch]"
          role="list"
          aria-label={t('flash.listAria')}
        >
          {MOCK_FLASH_NOTES.map((note) => (
            <div
              key={note.id}
              role="listitem"
              className="flex w-[4.5rem] shrink-0 snap-start flex-col items-center gap-1.5"
            >
              <div className="relative flex h-16 w-16 min-h-11 min-w-11 items-center justify-center rounded-full bg-white/10 p-[3px] shadow-[0_0_16px_rgba(255,95,31,0.45)] ring-2 ring-[#FF5F1F] backdrop-blur-md">
                <div className="relative h-full w-full overflow-hidden rounded-full bg-[#121212]">
                  <Image
                    src={note.imageUrl}
                    alt={note.name}
                    fill
                    sizes="64px"
                    className="object-cover select-none"
                    style={NATIVE_APP_IMAGE_STYLE}
                    draggable={false}
                  />
                </div>
              </div>
              <span className="w-full truncate text-center text-[11px] font-medium text-zinc-300">
                {note.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
