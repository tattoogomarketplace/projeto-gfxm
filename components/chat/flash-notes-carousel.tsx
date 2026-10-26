'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Pencil, Plus, Radio, Zap } from 'lucide-react';
import { FlashNoteCreatorSheet, FLASH_NOTE_MAX_LENGTH } from '@/components/chat/flash-note-creator-sheet';
import { FlashNoteModal } from '@/components/features/flash-note-modal';
import { FlashNoteStoryRing } from '@/components/features/flash-note-story-ring';
import { getFlashNoteBackground, type FlashNoteStyle } from '@/lib/flash-notes-style';
import {
  flashNoteViewedFlags,
  formatFlashNoteHandle,
  groupFlashNotesByArtist,
  pickFlashNoteToOpen,
} from '@/lib/flash-note-ring';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/hooks/use-auth-store';
import { useFlashNoteViewed } from '@/hooks/use-flash-note-viewed';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { toast } from '@/lib/toast';
import type { FlashNoteDto } from '@/lib/types/chat';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/use-i18n';

async function authHeaders(getToken: () => Promise<string | null>): Promise<HeadersInit> {
  const clerkToken = await getToken().catch(() => null);
  const stored = typeof window !== 'undefined' ? localStorage.getItem('tattoogo_token') : null;
  const token = clerkToken || stored;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function FlashNotesCarousel() {
  const { getToken } = useAuth();
  const router = useRouter();
  const getTokenRef = useRef(getToken);
  const { t } = useI18n();
  const { triggerHaptic } = useHapticFeedback();
  const role = useAuthStore((s) => s.role);
  const canBroadcast = role === 'tatuador';

  const [notes, setNotes] = useState<FlashNoteDto[]>([]);
  const [actorId, setActorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [selected, setSelected] = useState<FlashNoteDto | null>(null);
  const { viewedIds, markViewed } = useFlashNoteViewed();
  const snapshotRef = useRef<FlashNoteDto[] | null>(null);
  const artistStories = useMemo(() => groupFlashNotesByArtist(notes), [notes]);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const ownNote = useMemo(
    () => (actorId ? notes.find((note) => note.userId === actorId) ?? null : null),
    [actorId, notes]
  );

  // The ring is the persisted style's source of truth on the Hub — it reflects
  // the note's backgroundId the instant the optimistic update lands.
  const ownBackground = useMemo(
    () => (ownNote ? getFlashNoteBackground(ownNote.backgroundId) : null),
    [ownNote]
  );

  const loadNotes = useCallback(async () => {
    try {
      const headers = await authHeaders(getTokenRef.current);
      const res = await fetch('/api/chat/flash-notes', { headers, cache: 'no-store' });
      if (!res.ok) return;
      const json = (await res.json().catch(() => ({}))) as {
        actorId?: string;
        notes?: FlashNoteDto[];
      };
      if (json.actorId) setActorId(json.actorId);
      setNotes(Array.isArray(json.notes) ? json.notes : []);
    } catch {
      return;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  const selectNote = useCallback(
    (note: FlashNoteDto | null) => {
      if (note) markViewed(note.id);
      setSelected(note);
    },
    [markViewed]
  );

  // The publish affordance is a first-class touch target: it always answers the
  // tap with a light haptic and lifts the immersive composer above the hub.
  const openComposer = useCallback(() => {
    triggerHaptic('light');
    setCreatorOpen(true);
  }, [triggerHaptic]);

  const closeComposer = useCallback(() => {
    setCreatorOpen(false);
  }, []);

  // Returns `true` when the note is persisted. Keeps optimistic rollback so the
  // composer can safely retry without desyncing the carousel. When the artist
  // already owns a note we PATCH it; otherwise we POST a brand new one. Either
  // way the full style payload (backgroundId/fontClass/alignClass) is sent so
  // the ring and preview survive reloads.
  const publishNote = useCallback(
    async (
      content: string,
      style: FlashNoteStyle,
      offer: { price: number; discountPercentage: number | null },
      imageUrl: string
    ): Promise<boolean> => {
      const trimmed = content.trim();
      if (!trimmed) return false;
      if (trimmed.length > FLASH_NOTE_MAX_LENGTH) {
        toast.error(t('toast.flashMax', { count: FLASH_NOTE_MAX_LENGTH }));
        return false;
      }
      const mediaUrl = imageUrl.trim();
      if (!mediaUrl) {
        toast.error(t('flash.imageRequired'));
        return false;
      }

      const editing = ownNote;
      snapshotRef.current = notes;
      const optimistic: FlashNoteDto = {
        id: editing?.id ?? `optimistic-${Date.now()}`,
        userId: actorId ?? 'me',
        content: trimmed,
        backgroundId: style.backgroundId,
        fontClass: style.fontClass,
        alignClass: style.alignClass,
        price: offer.price,
        discountPercentage: offer.discountPercentage,
        salePrice:
          offer.discountPercentage != null
            ? Number((offer.price * (1 - offer.discountPercentage / 100)).toFixed(2))
            : offer.price,
        imageUrl: mediaUrl,
        createdAt: editing?.createdAt ?? new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        ativa: true,
        author: editing?.author ?? {
          id: actorId ?? 'me',
          name: t('flash.you'),
          username: null,
          role: 'tatuador',
          initial: 'V',
          cidade: null,
          estado: null,
          avatarUrl: null,
        },
      };

      setNotes((current) => [
        optimistic,
        ...current.filter((note) => note.userId !== optimistic.userId),
      ]);

      try {
        const headers = await authHeaders(getTokenRef.current);
        const res = await fetch(
          editing ? `/api/chat/flash-notes/${encodeURIComponent(editing.id)}` : '/api/chat/flash-notes',
          {
            method: editing ? 'PATCH' : 'POST',
            headers,
            body: JSON.stringify({
              content: trimmed,
              backgroundId: style.backgroundId,
              fontClass: style.fontClass,
              alignClass: style.alignClass,
              price: offer.price,
              discountPercentage: offer.discountPercentage,
              imageUrl: mediaUrl,
            }),
          }
        );
        const json = (await res.json().catch(() => ({}))) as {
          sucesso?: boolean;
          erro?: string;
          note?: FlashNoteDto;
          actorId?: string;
        };
        if (!res.ok || !json.note) {
          if (snapshotRef.current) setNotes(snapshotRef.current);
          toast.error(json.erro || t('toast.flashPublishFailed'));
          return false;
        }
        if (json.actorId) setActorId(json.actorId);
        setNotes((current) => [
          json.note as FlashNoteDto,
          ...current.filter(
            (note) => note.id !== optimistic.id && note.userId !== json.note?.userId
          ),
        ]);
        return true;
      } catch (error) {
        if (snapshotRef.current) setNotes(snapshotRef.current);
        toast.error(error instanceof Error ? error.message : String(error));
        return false;
      }
    },
    [actorId, notes, ownNote, t]
  );

  // Removes the artist's own note. Optimistic with rollback so a flaky network
  // never desyncs the carousel from the backend.
  const deleteOwnNote = useCallback(async (): Promise<boolean> => {
    if (!ownNote) return false;
    const target = ownNote;
    snapshotRef.current = notes;
    setNotes((current) => current.filter((note) => note.userId !== target.userId));

    try {
      const headers = await authHeaders(getTokenRef.current);
      const res = await fetch(`/api/chat/flash-notes/${encodeURIComponent(target.id)}`, {
        method: 'DELETE',
        headers,
      });
      const json = (await res.json().catch(() => ({}))) as { sucesso?: boolean; erro?: string };
      if (!res.ok || !json.sucesso) {
        if (snapshotRef.current) setNotes(snapshotRef.current);
        toast.error(json.erro || t('toast.flashDeleteFailed'));
        return false;
      }
      return true;
    } catch (error) {
      if (snapshotRef.current) setNotes(snapshotRef.current);
      toast.error(error instanceof Error ? error.message : String(error));
      return false;
    }
  }, [notes, ownNote, t]);

  return (
    <section className="relative shrink-0 px-[max(0.25rem,env(safe-area-inset-left,0px))] pr-[max(0.25rem,env(safe-area-inset-right,0px))]">
      <div className="mb-2 flex items-center gap-2 px-1">
        <Zap className="h-3.5 w-3.5 text-orange-500 dark:text-orange-400" strokeWidth={2} />
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-500 dark:text-orange-400">
          {t('flash.heading')}
        </p>
      </div>

      <div
        className={cn(
          'flex min-h-[5.25rem] gap-3 overflow-x-auto overscroll-x-contain pb-1 pt-0.5',
          'snap-x snap-mandatory scroll-smooth',
          '[-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none]',
          '[&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0',
          'transform-gpu will-change-transform'
        )}
        role="list"
        aria-label={t('flash.listAria')}
      >
        {canBroadcast ? (
          <button
            type="button"
            onClick={openComposer}
            aria-haspopup="dialog"
            className="relative z-[1] flex w-[clamp(4.25rem,20vw,4.75rem)] shrink-0 touch-manipulation snap-start flex-col items-center gap-1.5 active:scale-[0.97]"
            aria-label={ownNote ? t('flash.updateAria') : t('flash.publishAria')}
          >
            <span
              className="relative flex h-14 w-14 min-h-11 min-w-11 items-center justify-center rounded-full p-[2px]"
              style={{
                backgroundImage: ownBackground
                  ? `conic-gradient(from 180deg at 50% 50%, ${ownBackground.ring}, #FFBF00, ${ownBackground.ring})`
                  : 'conic-gradient(from 180deg at 50% 50%, #F97316, #FFBF00, #F97316)',
              }}
            >
              <span className="flex h-full w-full items-center justify-center rounded-full border border-black/[0.04] bg-white text-orange-500 dark:border-white/[0.05] dark:bg-white/[0.03] dark:text-orange-400">
                {ownNote ? <Pencil className="h-5 w-5" strokeWidth={1.75} /> : <Plus className="h-5 w-5" strokeWidth={1.75} />}
              </span>
            </span>
            <span className="w-full truncate text-center text-[10px] font-semibold text-neutral-700 dark:text-zinc-300">
              {ownNote ? t('flash.ownNote') : t('flash.publish')}
            </span>
          </button>
        ) : null}

        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div key={`flash-skel-${index}`} className="flex w-[clamp(4.25rem,20vw,4.75rem)] shrink-0 flex-col items-center gap-1.5">
                <Skeleton className="h-14 w-14 rounded-full" />
                <Skeleton className="h-2.5 w-12 rounded-full" />
              </div>
            ))
          : artistStories.map((story) => {
              const cover = pickFlashNoteToOpen(story, viewedIds) ?? story.notes[0];
              if (!cover) return null;
              const handle = formatFlashNoteHandle(story.author?.username, story.author?.name);
              const name = story.author?.name || t('flash.artist');
              const initial = story.author?.initial ?? 'A';
              const isOwn = actorId != null && story.userId === actorId;
              return (
                <button
                  key={story.userId}
                  type="button"
                  role="listitem"
                  onClick={() => {
                    triggerHaptic('light');
                    if (isOwn && canBroadcast) {
                      openComposer();
                      return;
                    }
                    selectNote(cover);
                  }}
                  className="relative z-[1] flex w-[clamp(4.25rem,20vw,4.75rem)] shrink-0 touch-manipulation snap-start flex-col items-center gap-1.5 transition-transform duration-150 ease-out [transform:translateZ(0)] active:scale-[0.97]"
                  aria-label={t('flash.aria', { name: handle })}
                >
                  <span className="relative flex h-14 w-14 min-h-11 min-w-11 items-center justify-center">
                    <FlashNoteStoryRing
                      segmentCount={story.notes.length}
                      viewedFlags={flashNoteViewedFlags(story.notes, viewedIds)}
                    >
                      {cover.imageUrl || story.author?.avatarUrl ? (
                        <OptimizedImage
                          src={cover.imageUrl || story.author?.avatarUrl}
                          alt={name}
                          sizes="56px"
                          className="h-full w-full rounded-full object-cover"
                          fallback={
                            <span className="flex h-full w-full items-center justify-center bg-[#121212] text-sm font-semibold uppercase text-[#FF5F1F]">
                              {initial}
                            </span>
                          }
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center bg-[#121212] text-sm font-semibold uppercase text-[#FF5F1F]">
                          {initial}
                        </span>
                      )}
                    </FlashNoteStoryRing>
                    <span className="absolute -bottom-0.5 -right-0.5 z-[1] flex h-4 w-4 items-center justify-center rounded-full border border-[#121212] bg-[#FF5F1F] text-black shadow-[0_0_8px_rgba(255,95,31,0.4)]">
                      <Radio className="h-2.5 w-2.5" strokeWidth={2.5} />
                    </span>
                  </span>
                  <span className="w-full truncate text-center text-[10px] font-medium tracking-tight text-zinc-500">
                    {handle}
                  </span>
                </button>
              );
            })}
      </div>

      {canBroadcast ? null : (
        <div
          className="min-h-6 px-1 pt-2 text-[11px] text-neutral-500 dark:text-zinc-500"
          aria-hidden={loading || notes.length > 0}
        >
          {!loading && notes.length === 0 ? t('flash.empty') : null}
        </div>
      )}

      <FlashNoteCreatorSheet
        open={creatorOpen}
        isEditing={Boolean(ownNote)}
        initialContent={ownNote?.content ?? ''}
        initialBackgroundId={ownNote?.backgroundId}
        initialFontClass={ownNote?.fontClass}
        initialAlignClass={ownNote?.alignClass}
        initialPrice={ownNote?.price ?? null}
        initialDiscountPercentage={ownNote?.discountPercentage ?? null}
        initialImageUrl={ownNote?.imageUrl ?? null}
        onClose={closeComposer}
        onPublish={publishNote}
        onDelete={ownNote ? deleteOwnNote : undefined}
      />

      <FlashNoteModal
        note={selected}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        onBook={(note) => {
          setNotes((current) => current.filter((item) => item.id !== note.id));
          setSelected(null);
          void loadNotes();
          router.refresh();
        }}
        onNext={() => {
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
        }}
        onPrev={() => {
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
        }}
      />
    </section>
  );
}
