import { normalizeUsername } from '@/lib/username';
import type { FlashNoteAuthorDto, FlashNoteDto } from '@/lib/types/chat';

export const FLASH_NOTE_RING_UNVIEWED = '#FF5F1F';
export const FLASH_NOTE_RING_VIEWED = '#90EE90';
export const FLASH_NOTE_RING_GAP_DEGREES = 12;
export const FLASH_NOTE_RING_SIZE = 56;
export const FLASH_NOTE_RING_STROKE = 2.25;

export type FlashNoteRingSegment = {
  index: number;
  color: string;
  viewed: boolean;
  dashArray: string;
  dashOffset: number;
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

export function buildFlashNoteRingSegments(input: {
  count: number;
  viewed?: readonly boolean[];
  radius: number;
  strokeWidth?: number;
}): FlashNoteRingSegment[] {
  const count = Math.max(1, Math.floor(Number.isFinite(input.count) ? input.count : 1));
  const strokeWidth = input.strokeWidth ?? FLASH_NOTE_RING_STROKE;
  const circumference = 2 * Math.PI * input.radius;
  const gapDegrees = count === 1 ? 0 : FLASH_NOTE_RING_GAP_DEGREES;
  const capCompensation = count === 1 ? 0 : strokeWidth;
  const gapLength = (gapDegrees / 360) * circumference + capCompensation;
  const rawSegment = circumference / count - gapLength;
  const segmentLength = Math.max(circumference * 0.04, rawSegment);

  return Array.from({ length: count }, (_, index) => {
    const viewed = Boolean(input.viewed?.[index]);
    return {
      index,
      viewed,
      color: viewed ? FLASH_NOTE_RING_VIEWED : FLASH_NOTE_RING_UNVIEWED,
      dashArray: `${segmentLength} ${Math.max(0, circumference - segmentLength)}`,
      dashOffset: -(index * (segmentLength + gapLength)),
    };
  });
}
