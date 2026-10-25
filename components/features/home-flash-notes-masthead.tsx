'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Radio, X, Zap } from 'lucide-react';
import { BRAND_NAME, BRAND_WORDMARK } from '@/lib/i18n/brands';
import { FLASH_NOTE_MAX_LENGTH, getFlashNoteBackground } from '@/lib/flash-notes-style';
import { artistProfileHref } from '@/lib/artist-profile';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { OptimizedImage } from '@/components/ui/optimized-image';
import type { FlashNoteDto } from '@/lib/types/chat';
import { cn } from '@/lib/utils';

function truncateNote(content: string): string {
  const trimmed = content.trim();
  if (trimmed.length <= FLASH_NOTE_MAX_LENGTH) return trimmed;
  return `${trimmed.slice(0, FLASH_NOTE_MAX_LENGTH - 1).trimEnd()}…`;
}

function remainingLabel(expiresAt: string, expiringLabel: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return expiringLabel;
  const hours = Math.max(1, Math.round(ms / (60 * 60 * 1000)));
  return hours === 1 ? '1h' : `${hours}h`;
}

function BrandWordmark() {
  return (
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
  );
}

export function HomeFlashNotesMasthead({ notes = [] }: { notes?: FlashNoteDto[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const { triggerHaptic } = useHapticFeedback();
  const [selected, setSelected] = useState<FlashNoteDto | null>(null);

  const openNote = useCallback(
    (note: FlashNoteDto) => {
      triggerHaptic('light');
      setSelected(note);
    },
    [triggerHaptic]
  );

  const closeNote = useCallback(() => setSelected(null), []);

  const visitArtist = useCallback(
    (note: FlashNoteDto) => {
      triggerHaptic('light');
      setSelected(null);
      router.push(
        artistProfileHref({
          id: note.author?.id ?? note.userId,
          username: note.author?.username,
        })
      );
    },
    [router, triggerHaptic]
  );

  return (
    <div className="-mx-4 min-w-0 sm:-mx-6">
      <BrandWordmark />

      {notes.length === 0 ? null : (
        <section className="relative w-full shrink-0 bg-transparent px-[max(0.25rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] pb-3 pt-2">
          <div className="mb-2 flex items-center gap-2 px-4">
            <Zap className="h-3.5 w-3.5 text-orange-500" strokeWidth={2} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-500">
              {t('flash.heading')}
            </p>
          </div>

          <div
            className={cn(
              'flex min-h-[5.25rem] gap-3 overflow-x-auto overscroll-x-contain px-4 pb-1 pt-0.5',
              'snap-x snap-mandatory scroll-smooth',
              'hide-scrollbar transform-gpu will-change-transform',
              '[-webkit-overflow-scrolling:touch]'
            )}
            role="list"
            aria-label={t('flash.listAria')}
          >
            {notes.map((note) => {
              const name = note.author?.name || t('flash.artist');
              const initial = note.author?.initial ?? 'A';
              const ring = getFlashNoteBackground(note.backgroundId).ring;
              return (
                <button
                  key={note.id}
                  type="button"
                  role="listitem"
                  onClick={() => openNote(note)}
                  className="relative z-[1] flex w-[clamp(4.25rem,20vw,4.75rem)] shrink-0 touch-manipulation snap-start flex-col items-center gap-1.5 active:scale-[0.97]"
                  aria-label={t('flash.aria', { name })}
                >
                  <span
                    className="relative flex h-14 w-14 min-h-11 min-w-11 items-center justify-center rounded-full p-[2px]"
                    style={{
                      backgroundImage: `conic-gradient(from 210deg at 50% 50%, ${ring}, #FFBF00, ${ring})`,
                    }}
                  >
                    <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-white bg-[#1a1a1a] text-sm font-semibold text-orange-400 dark:border-[#0a0a0a]">
                      {note.author?.avatarUrl ? (
                        <OptimizedImage
                          src={note.author.avatarUrl}
                          alt={name}
                          className="h-full w-full rounded-full"
                        />
                      ) : (
                        initial
                      )}
                    </span>
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-[#0a0a0a] bg-orange-500 text-black">
                      <Radio className="h-2.5 w-2.5" strokeWidth={2.5} />
                    </span>
                  </span>
                  <span className="w-full truncate text-center text-[10px] font-medium text-zinc-400">
                    {truncateNote(note.content)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {selected ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-sm rounded-2xl border border-white/[0.05] bg-[#121212] p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => visitArtist(selected)}
                className="flex min-w-0 items-center gap-3 text-left"
              >
                <span className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center overflow-hidden rounded-full border border-orange-500/40 bg-[#1a1a1a] text-sm font-semibold text-orange-400">
                  {selected.author?.avatarUrl ? (
                    <OptimizedImage
                      src={selected.author.avatarUrl}
                      alt={selected.author?.name || t('flash.artist')}
                      className="h-full w-full rounded-full"
                    />
                  ) : (
                    selected.author?.initial ?? 'A'
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {selected.author?.name || t('flash.artist')}
                  </p>
                  <p className="text-[11px] text-orange-500">
                    {t('flash.active')} · {remainingLabel(selected.expiresAt, t('flash.expiring'))}
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={closeNote}
                className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-full text-zinc-400"
                aria-label={t('common.close')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-zinc-300">
              {truncateNote(selected.content)}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
