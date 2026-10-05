export const NOTIFICATION_PREFS_KEY = 'tattoogo-notification-prefs';

export type NotificationPrefKey =
  | 'reminders'
  | 'chat'
  | 'proposals'
  | 'marketing';

export type NotificationPrefs = Record<NotificationPrefKey, boolean>;

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  reminders: true,
  chat: true,
  proposals: true,
  marketing: false,
};

const listeners = new Set<() => void>();
let cachedPrefs: NotificationPrefs | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function normalizeNotificationPrefs(raw: unknown): NotificationPrefs {
  if (!isRecord(raw)) return { ...DEFAULT_NOTIFICATION_PREFS };
  return {
    reminders: typeof raw.reminders === 'boolean' ? raw.reminders : DEFAULT_NOTIFICATION_PREFS.reminders,
    chat: typeof raw.chat === 'boolean' ? raw.chat : DEFAULT_NOTIFICATION_PREFS.chat,
    proposals: typeof raw.proposals === 'boolean' ? raw.proposals : DEFAULT_NOTIFICATION_PREFS.proposals,
    marketing: typeof raw.marketing === 'boolean' ? raw.marketing : DEFAULT_NOTIFICATION_PREFS.marketing,
  };
}

function readFromStorage(): NotificationPrefs {
  if (typeof window === 'undefined') return { ...DEFAULT_NOTIFICATION_PREFS };
  try {
    const raw = window.localStorage.getItem(NOTIFICATION_PREFS_KEY);
    if (!raw) return { ...DEFAULT_NOTIFICATION_PREFS };
    return normalizeNotificationPrefs(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFS };
  }
}

function writeToStorage(prefs: NotificationPrefs) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Storage can be unavailable (private mode); in-memory state still applies.
  }
}

export function getNotificationPrefs(): NotificationPrefs {
  if (!cachedPrefs) {
    cachedPrefs = readFromStorage();
  }
  return cachedPrefs;
}

export function subscribeNotificationPrefs(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getNotificationPrefsSnapshot(): NotificationPrefs {
  cachedPrefs = readFromStorage();
  return cachedPrefs;
}

export function getNotificationPrefsServerSnapshot(): NotificationPrefs {
  return DEFAULT_NOTIFICATION_PREFS;
}

export function setNotificationPref(key: NotificationPrefKey, value: boolean): NotificationPrefs {
  const next = { ...getNotificationPrefs(), [key]: value };
  cachedPrefs = next;
  writeToStorage(next);
  listeners.forEach((listener) => listener());
  return next;
}
