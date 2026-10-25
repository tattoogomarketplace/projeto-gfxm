'use client';

import Image from 'next/image';
import { Zap } from 'lucide-react';
import { BRAND_NAME, BRAND_WORDMARK } from '@/lib/i18n/brands';
import { useI18n } from '@/hooks/use-i18n';
import { NATIVE_APP_IMAGE_STYLE } from '@/components/ui/optimized-image';

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
          className="select-none text-[clamp(1.75rem,7vw,2.5rem)] font-extrabold leading-none tracking-tight"
          aria-label={BRAND_NAME}
        >
          <span className="text-white">{BRAND_WORDMARK.main}</span>
          <span className="ml-1 text-[#FF5F1F] [text-shadow:0_0_20px_rgba(255,95,31,0.45)]">
            {BRAND_WORDMARK.mark}
          </span>
        </p>
      </div>

      <section className="relative w-full bg-transparent pb-3 pt-2">
        <div className="mb-2 flex items-center gap-2 px-4">
          <Zap className="h-3.5 w-3.5 text-orange-500" strokeWidth={2} />
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-500">
            {t('flash.heading')}
          </p>
        </div>
        <div
          className="hide-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-4 pr-16 transform-gpu will-change-transform [-webkit-overflow-scrolling:touch]"
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
      </section>
    </div>
  );
}
