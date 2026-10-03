/**
 * Clerk session tasks are required steps (e.g. resetting a password) a user
 * must complete before their session becomes active. They are configured in
 * the Clerk Dashboard and surfaced through `session.currentTask`.
 *
 * Organization selection is intentionally excluded: this product uses custom
 * Studio (CNPJ) logic, not Clerk Organizations. `choose-organization` is
 * mapped straight to `/dashboard` so users never hit `<TaskChooseOrganization>`.
 *
 * Clerk navigates to the URL registered for each task key via the
 * `taskUrls` prop on `<ClerkProvider>`. These helpers are the single source of
 * truth for both that mapping and the client-side guard.
 */
export type SessionTaskKey = 'reset-password' | 'setup-mfa';

export const SESSION_TASK_PATH_PREFIX = '/session-tasks';

export const SESSION_TASK_URLS: Record<SessionTaskKey, string> = {
  'reset-password': `${SESSION_TASK_PATH_PREFIX}/reset-password`,
  'setup-mfa': `${SESSION_TASK_PATH_PREFIX}/setup-mfa`,
};

/** Destination once every pending task has been resolved. */
export const SESSION_TASK_COMPLETE_URL = '/dashboard';

/** Clerk task we never surface — custom Studio/CNPJ flow owns this step. */
export const BYPASSED_SESSION_TASK_KEY = 'choose-organization';

/**
 * Full `taskUrls` map passed to `<ClerkProvider>`. Organization is routed to
 * the dashboard so Clerk itself never parks the user on its org picker.
 */
export const CLERK_TASK_URLS: Record<string, string> = {
  ...SESSION_TASK_URLS,
  [BYPASSED_SESSION_TASK_KEY]: SESSION_TASK_COMPLETE_URL,
};

const SESSION_TASK_KEYS = Object.keys(SESSION_TASK_URLS) as SessionTaskKey[];

export function isSessionTaskKey(value: unknown): value is SessionTaskKey {
  return typeof value === 'string' && (SESSION_TASK_KEYS as string[]).includes(value);
}

export function isBypassedSessionTask(value: unknown): boolean {
  return value === BYPASSED_SESSION_TASK_KEY;
}

export function isSessionTaskPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return (
    pathname === SESSION_TASK_PATH_PREFIX ||
    pathname.startsWith(`${SESSION_TASK_PATH_PREFIX}/`)
  );
}
