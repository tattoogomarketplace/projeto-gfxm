/**
 * Clerk session tasks are required steps (e.g. choosing an organization or
 * resetting a password) a user must complete before their session becomes
 * active. They are configured in the Clerk Dashboard and surfaced through
 * `session.currentTask`.
 *
 * Clerk navigates to the URL registered for each task key via the
 * `taskUrls` prop on `<ClerkProvider>`. These helpers are the single source of
 * truth for both that mapping and the client-side guard.
 */
export type SessionTaskKey = 'choose-organization' | 'reset-password' | 'setup-mfa';

export const SESSION_TASK_PATH_PREFIX = '/session-tasks';

export const SESSION_TASK_URLS: Record<SessionTaskKey, string> = {
  'choose-organization': `${SESSION_TASK_PATH_PREFIX}/choose-organization`,
  'reset-password': `${SESSION_TASK_PATH_PREFIX}/reset-password`,
  'setup-mfa': `${SESSION_TASK_PATH_PREFIX}/setup-mfa`,
};

/** Destination once every pending task has been resolved. */
export const SESSION_TASK_COMPLETE_URL = '/dashboard';

const SESSION_TASK_KEYS = Object.keys(SESSION_TASK_URLS) as SessionTaskKey[];

export function isSessionTaskKey(value: unknown): value is SessionTaskKey {
  return typeof value === 'string' && (SESSION_TASK_KEYS as string[]).includes(value);
}

export function isSessionTaskPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return (
    pathname === SESSION_TASK_PATH_PREFIX ||
    pathname.startsWith(`${SESSION_TASK_PATH_PREFIX}/`)
  );
}
