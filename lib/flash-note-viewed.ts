export const FLASH_NOTE_VIEWED_STORAGE_KEY = 'tattoogo-flash-note-viewed';

const EMPTY_VIEWED_IDS: ReadonlySet<string> = new Set();
const listeners = new Set<() => void>();
let cachedIds: ReadonlySet<string> | null = null;
let storageBound = false;

function isNonEmptyId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function readFromStorage(): ReadonlySet<string> {
  if (typeof window === 'undefined') return EMPTY_VIEWED_IDS;
  try {
    const raw = window.localStorage.getItem(FLASH_NOTE_VIEWED_STORAGE_KEY);
    if (!raw) return EMPTY_VIEWED_IDS;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return EMPTY_VIEWED_IDS;
    const ids = parsed.filter(isNonEmptyId);
    return ids.length === 0 ? EMPTY_VIEWED_IDS : new Set(ids);
  } catch {
    return EMPTY_VIEWED_IDS;
  }
}

function writeToStorage(ids: ReadonlySet<string>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FLASH_NOTE_VIEWED_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Storage can be unavailable (private mode); in-memory state still applies.
  }
}

function emit() {
  listeners.forEach((listener) => listener());
}

function bindStorageListener() {
  if (storageBound || typeof window === 'undefined') return;
  storageBound = true;
  window.addEventListener('storage', (event) => {
    if (event.key !== FLASH_NOTE_VIEWED_STORAGE_KEY) return;
    cachedIds = readFromStorage();
    emit();
  });
}

export function getFlashNoteViewedIds(): ReadonlySet<string> {
  bindStorageListener();
  if (!cachedIds) {
    cachedIds = readFromStorage();
  }
  return cachedIds;
}

export function subscribeFlashNoteViewed(listener: () => void) {
  bindStorageListener();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getFlashNoteViewedServerSnapshot(): ReadonlySet<string> {
  return EMPTY_VIEWED_IDS;
}

export function markFlashNoteViewed(noteId: string): ReadonlySet<string> {
  if (!isNonEmptyId(noteId)) return getFlashNoteViewedIds();
  const current = getFlashNoteViewedIds();
  if (current.has(noteId)) return current;
  const next = new Set(current);
  next.add(noteId);
  cachedIds = next;
  writeToStorage(next);
  emit();
  return next;
}

export function retainFlashNoteViewed(activeIds: Iterable<string>): ReadonlySet<string> {
  const current = getFlashNoteViewedIds();
  const active = new Set(Array.from(activeIds).filter(isNonEmptyId));
  if (active.size === 0) return current;

  let changed = false;
  const next = new Set<string>();
  for (const id of current) {
    if (active.has(id)) {
      next.add(id);
      continue;
    }
    changed = true;
  }
  if (!changed) return current;

  cachedIds = next.size === 0 ? EMPTY_VIEWED_IDS : next;
  writeToStorage(cachedIds);
  emit();
  return cachedIds;
}
