import { normalizeUsername } from '@/lib/username';
import type { FlashNoteAuthorDto, FlashNoteDto } from '@/lib/types/chat';

export const FLASH_NOTE_RING_UNVIEWED = '#FF5F1F';
export const FLASH_NOTE_RING_VIEWED = '#90EE90';
export const FLASH_NOTE_RING_TRACK = '#121212';
export const FLASH_NOTE_RING_SIZE = 56;
export const FLASH_NOTE_RING_STROKE = 2.5;
export const FLASH_NOTE_RING_INNER_GAP = 2.5;
export const FLASH_NOTE_RING_GAP_PX = 3.5;
export const FLASH_NOTE_RING_GAP_MIN_PX = 2;

export type FlashNoteRingLinecap = 'butt' | 'round';

export type FlashNoteRingSegment = {
  index: number;
  color: string;
  viewed: boolean;
  dashArray: string;
  dashOffset: number;
  linecap: FlashNoteRingLinecap;
};

export type FlashNoteArtistStory = {
  userId: string;
  author: FlashNoteAuthorDto | null;
  notes: FlashNoteDto[];
};

export function formatFlashNoteHandle(
  username?: string | null,
  fallback = 'artista'
): string {
  const handle = normalizeUsername(username) || normalizeUsername(fallback) || 'artista';
  return `@${handle}`;
}

export function groupFlashNotesByArtist(
  notes: readonly FlashNoteDto[]
): FlashNoteArtistStory[] {
  const stories: FlashNoteArtistStory[] = [];
  const indexByUser = new Map<string, number>();

  for (const note of notes) {
    const existing = indexByUser.get(note.userId);
    if (existing != null) {
      stories[existing].notes.push(note);
      continue;
    }
    indexByUser.set(note.userId, stories.length);
    stories.push({
      userId: note.userId,
      author: note.author,
      notes: [note],
    });
  }

  return stories;
}

export function pickFlashNoteToOpen(
  story: FlashNoteArtistStory,
  viewedIds: ReadonlySet<string>
): FlashNoteDto | null {
  if (story.notes.length === 0) return null;
  return story.notes.find((note) => !viewedIds.has(note.id)) ?? story.notes[0] ?? null;
}

export function flashNoteViewedFlags(
  notes: readonly FlashNoteDto[],
  viewedIds: ReadonlySet<string>
): boolean[] {
  return notes.map((note) => viewedIds.has(note.id));
}

function ringColor(viewed: boolean): string {
  return viewed ? FLASH_NOTE_RING_VIEWED : FLASH_NOTE_RING_UNVIEWED;
}

export function resolveFlashNoteRingGapLength(
  count: number,
  circumference: number,
  strokeWidth: number
): { gapLength: number; segmentLength: number; slot: number; linecap: FlashNoteRingLinecap } {
  const safeCount = Math.max(1, count);
  const slot = circumference / safeCount;

  if (safeCount === 1 || circumference <= 0) {
    return { gapLength: 0, segmentLength: circumference, slot: circumference, linecap: 'butt' };
  }

  const roundCaps = slot > strokeWidth * 3;
  const capPad = roundCaps ? strokeWidth : 0;
  const maxVisualGap = slot * 0.38;
  const visualGap = Math.max(
    FLASH_NOTE_RING_GAP_MIN_PX,
    Math.min(FLASH_NOTE_RING_GAP_PX, maxVisualGap)
  );
  const maxGap = slot * 0.72;
  const gapLength = Math.min(visualGap + capPad, maxGap);
  return {
    gapLength,
    segmentLength: slot - gapLength,
    slot,
    linecap: roundCaps ? 'round' : 'butt',
  };
}

export function buildFlashNoteRingSegments(input: {
  count: number;
  viewed?: readonly boolean[];
  radius: number;
  strokeWidth?: number;
}): FlashNoteRingSegment[] {
  const count = Math.max(1, Math.floor(Number.isFinite(input.count) ? input.count : 1));
  const strokeWidth = input.strokeWidth ?? FLASH_NOTE_RING_STROKE;
  const circumference = 2 * Math.PI * Math.max(0, input.radius);
  const geometry = resolveFlashNoteRingGapLength(count, circumference, strokeWidth);

  return Array.from({ length: count }, (_, index) => {
    const viewed = Boolean(input.viewed?.[index]);
    return {
      index,
      viewed,
      color: ringColor(viewed),
      dashArray:
        count === 1
          ? `${circumference} 0`
          : `${geometry.segmentLength} ${Math.max(0, circumference - geometry.segmentLength)}`,
      dashOffset: -(index * geometry.slot),
      linecap: geometry.linecap,
    };
  });
}
