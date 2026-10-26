'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Radio, Zap } from 'lucide-react';
import { BRAND_NAME, BRAND_WORDMARK } from '@/lib/i18n/brands';
import { FLASH_NOTE_MAX_LENGTH, getFlashNoteBackground } from '@/lib/flash-notes-style';
import { artistProfileHref } from '@/lib/artist-profile';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { FlashNoteModal } from '@/components/features/flash-note-modal';
import type { FlashNoteDto } from '@/lib/types/chat';
import { cn } from '@/lib/utils';

function truncateNote(content: string): string {
  const trimmed = content.trim();
  if (trimmed.length <= FLASH_NOTE_MAX_LENGTH) return trimmed;
  return `${trimmed.slice(0, FLASH_NOTE_MAX_LENGTH - 1).trimEnd()}…`;
}

function BrandWordmark() {
  return (
    <div className="relative flex h-11 w-full items-center justify-center overflow-visible bg-transparent px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-8 w-28 -translate-x-[68%] -translate-y-1/2 rounded-full bg-[#90EE90]/25 blur-xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-8 w-14 translate-x-[8%] -translate-y-1/2 rounded-full bg-[#FF5F1F]/30 blur-xl"
      />
      <p
        className="relative flex max-w-full items-baseline justify-center gap-1.5 select-none leading-none"
        aria-label={BRAND_NAME}
      >
        <span className="relative inline-block leading-none">
          <span className="font-caveat text-2xl font-bold leading-none tracking-tight text-[#90EE90] drop-shadow-[0_0_8px_rgba(144,238,144,0.4)] sm:text-3xl">
            {BRAND_WORDMARK.main}
          </span>
          <svg
            aria-hidden
            viewBox="0 0 88 8"
            className="pointer-events-none absolute inset-x-0 -bottom-[5px] mx-auto h-[7px] w-[92%] text-[#90EE90] drop-shadow-[0_0_6px_rgba(144,238,144,0.45)]"
          >
            <path
              d="M2 5.4 C 20 1.8, 44 1.4, 68 3.6 C 76 4.4, 82 5.8, 86 6.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span className="shrink-0 font-sans text-lg font-black leading-none tracking-tight text-[#FF5F1F] drop-shadow-[0_0_8px_rgba(255,95,31,0.4)] sm:text-xl">
          {BRAND_WORDMARK.mark}
        </span>
      </p>
    </div>
  );
}

function StoryAvatar({
  src,
  alt,
  fallback,
}: {
  src?: string | null;
  alt: string;
  fallback: string;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      sizes="56px"
      className="h-full w-full rounded-full"
      fallback={
        <span className="flex h-full w-full items-center justify-center text-sm font-semibold uppercase text-orange-400">
          {fallback}
        </span>
      }
    />
  );
}

export function HomeFlashNotesMasthead({ notes = [] }: { notes?: FlashNoteDto[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const { triggerHaptic } = useHapticFeedback();
  const [selected, setSelected] = useState<FlashNoteDto | null>(null);
  const [consumedIds, setConsumedIds] = useState<ReadonlySet<string>>(() => new Set());
  const visibleNotes = notes.filter((note) => !consumedIds.has(note.id));

  const openNote = useCallback(
    (note: FlashNoteDto) => {
      triggerHaptic('light');
      setSelected(note);
    },
    [triggerHaptic]
  );

  const closeNote = useCallback(() => setSelected(null), []);

  const goNextNote = useCallback(() => {
    setSelected((current) => {
      if (!current) return current;
      const index = visibleNotes.findIndex((item) => item.id === current.id);
      if (index < 0) return null;
      if (index >= visibleNotes.length - 1) return null;
      return visibleNotes[index + 1] ?? null;
    });
  }, [visibleNotes]);

  const goPrevNote = useCallback(() => {
    setSelected((current) => {
      if (!current) return current;
      const index = visibleNotes.findIndex((item) => item.id === current.id);
      if (index <= 0) return current;
      return visibleNotes[index - 1] ?? current;
    });
  }, [visibleNotes]);

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

  const bookArtist = useCallback((note: FlashNoteDto) => {
    setConsumedIds((current) => {
      const next = new Set(current);
      next.add(note.id);
      return next;
    });
    setSelected(null);
    router.refresh();
  }, [router]);

  return (
    <div className="-mx-4 min-w-0 sm:-mx-6">
      <div className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#121212]/90 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] pb-3 backdrop-blur-2xl">
        <BrandWordmark />

        {visibleNotes.length === 0 ? null : (
          <section className="relative w-full shrink-0 bg-transparent px-[max(0.25rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] pt-2">
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
              {visibleNotes.map((note) => {
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
                      <span className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-white bg-[#1a1a1a] dark:border-[#0a0a0a]">
                        <StoryAvatar src={note.imageUrl || note.author?.avatarUrl} alt={name} fallback={initial} />
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
      </div>

      <FlashNoteModal
        note={selected}
        open={Boolean(selected)}
        onClose={closeNote}
        onBook={bookArtist}
        onVisitArtist={visitArtist}
        onNext={goNextNote}
        onPrev={goPrevNote}
      />
    </div>
  );
}
