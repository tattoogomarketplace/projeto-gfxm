'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
  getFlashNoteViewedIds,
  getFlashNoteViewedServerSnapshot,
  markFlashNoteViewed,
  subscribeFlashNoteViewed,
} from '@/lib/flash-note-viewed';

export function useFlashNoteViewed() {
  const viewedIds = useSyncExternalStore(
    subscribeFlashNoteViewed,
    getFlashNoteViewedIds,
    getFlashNoteViewedServerSnapshot
  );

  const markViewed = useCallback((noteId: string) => {
    markFlashNoteViewed(noteId);
  }, []);

  return { viewedIds, markViewed };
}
