'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Radio, Zap } from 'lucide-react';
import { artistProfileHref } from '@/lib/artist-profile';
import {
  flashNoteViewedFlags,
  formatFlashNoteHandle,
  groupFlashNotesByArtist,
  pickFlashNoteToOpen,
} from '@/lib/flash-note-ring';
import { useFlashNoteViewed } from '@/hooks/use-flash-note-viewed';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { FlashNoteModal } from '@/components/features/flash-note-modal';
import { FlashNoteStoryRing } from '@/components/features/flash-note-story-ring';
import type { FlashNoteDto } from '@/lib/types/chat';
import { cn } from '@/lib/utils';

function StoryAvatar({
  src,
  alt,
  fallback,
  priority = false,
}: {
  src?: string | null;
  alt: string;
  fallback: string;
  priority?: boolean;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      sizes="56px"
      className="h-full w-full rounded-full object-cover"
      priority={priority}
      fallback={
        <span className="flex h-full w-full items-center justify-center bg-[#121212] text-sm font-semibold uppercase text-[#FF5F1F]">
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
  const { viewedIds, markViewed } = useFlashNoteViewed();
  const [selected, setSelected] = useState<FlashNoteDto | null>(null);
  const [consumedIds, setConsumedIds] = useState<ReadonlySet<string>>(() => new Set());
  const visibleNotes = notes.filter((note) => !consumedIds.has(note.id));
  const artistStories = useMemo(() => groupFlashNotesByArtist(visibleNotes), [visibleNotes]);

  const selectNote = useCallback(
    (note: FlashNoteDto | null) => {
      if (note) markViewed(note.id);
      setSelected(note);
    },
    [markViewed]
  );

  const openNote = useCallback(
    (note: FlashNoteDto) => {
      triggerHaptic('light');
      selectNote(note);
    },
    [selectNote, triggerHaptic]
  );

  const closeNote = useCallback(() => setSelected(null), []);

  const goNextNote = useCallback(() => {
    setSelected((current) => {
      if (!current) return current;
      const storyIndex = artistStories.findIndex((story) => story.userId === current.userId);
      if (storyIndex < 0) return null;
      const story = artistStories[storyIndex];
      const noteIndex = story.notes.findIndex((item) => item.id === current.id);
      const next =
        noteIndex >= 0 && noteIndex < story.notes.length - 1
          ? story.notes[noteIndex + 1] ?? null
          : artistStories[storyIndex + 1]?.notes[0] ?? null;
      if (next) markViewed(next.id);
      return next;
    });
  }, [artistStories, markViewed]);

  const goPrevNote = useCallback(() => {
    setSelected((current) => {
      if (!current) return current;
      const storyIndex = artistStories.findIndex((story) => story.userId === current.userId);
      if (storyIndex < 0) return current;
      const story = artistStories[storyIndex];
      const noteIndex = story.notes.findIndex((item) => item.id === current.id);
      const previousStoryNotes = storyIndex > 0 ? artistStories[storyIndex - 1]?.notes : undefined;
      const previous =
        noteIndex > 0
          ? story.notes[noteIndex - 1] ?? current
          : previousStoryNotes?.[previousStoryNotes.length - 1] ?? current;
      if (previous) markViewed(previous.id);
      return previous;
    });
  }, [artistStories, markViewed]);

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
      <div className="flash-notes-piano sticky top-0 z-30 w-full border-b border-white/5 bg-black pb-3 backdrop-blur-2xl">
        <div
          data-ptr-slot
          className="relative isolate flex h-0 w-full shrink-0 items-start justify-center overflow-hidden bg-black contain-paint"
          aria-hidden
        />

        {visibleNotes.length === 0 ? null : (
          <section className="relative w-full shrink-0 bg-transparent px-[max(0.25rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] pt-2">
            <div className="mb-2 flex items-center gap-2 px-4">
              <Zap className="h-3.5 w-3.5 text-orange-500 [filter:drop-shadow(0_0_8px_rgba(255,95,31,0.55))_drop-shadow(0_0_22px_rgba(255,102,0,0.7))_drop-shadow(0_0_40px_rgba(255,102,0,0.4))]" strokeWidth={2} />
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-500 [text-shadow:0_0_8px_rgba(255,95,31,0.7),0_0_18px_rgba(255,102,0,0.85),0_0_36px_rgba(255,102,0,0.5),0_0_56px_rgba(255,102,0,0.28)]">
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
              {artistStories.map((story, index) => {
                const cover = pickFlashNoteToOpen(story, viewedIds) ?? story.notes[0];
                if (!cover) return null;
                const handle = formatFlashNoteHandle(story.author?.username, story.author?.name);
                const name = story.author?.name || t('flash.artist');
                const initial = story.author?.initial ?? 'A';
                return (
                  <button
                    key={story.userId}
                    type="button"
                    role="listitem"
                    onClick={() => openNote(cover)}
                    className="relative z-[1] flex w-[clamp(4.25rem,20vw,4.75rem)] shrink-0 touch-manipulation snap-start flex-col items-center gap-1.5 transition-transform duration-150 ease-out [transform:translateZ(0)] active:scale-[0.97]"
                    aria-label={t('flash.aria', { name: handle })}
                  >
                    <span className="relative flex h-14 w-14 min-h-11 min-w-11 items-center justify-center">
                      <FlashNoteStoryRing
                        segmentCount={story.notes.length}
                        viewedFlags={flashNoteViewedFlags(story.notes, viewedIds)}
                      >
                        <StoryAvatar
                          src={cover.imageUrl || story.author?.avatarUrl}
                          alt={name}
                          fallback={initial}
                          priority={index < 6}
                        />
                      </FlashNoteStoryRing>
                      <span className="absolute -bottom-0.5 -right-0.5 z-[1] flex h-4 w-4 items-center justify-center rounded-full border border-[#121212] bg-[#FF5F1F] text-black shadow-[0_0_8px_rgba(255,95,31,0.4)]">
                        <Radio className="h-2.5 w-2.5" strokeWidth={2.5} />
                      </span>
                    </span>
                    <span className="flash-note-handle w-full truncate bg-transparent text-center text-[10px] font-medium tracking-tight">
                      {handle}
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
