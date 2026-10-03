'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '@clerk/nextjs';
import {
  isBypassedSessionTask,
  isSessionTaskKey,
  isSessionTaskPath,
  SESSION_TASK_COMPLETE_URL,
  SESSION_TASK_URLS,
} from '@/lib/utils/session-tasks';

/**
 * Keeps pending Clerk session tasks from being bypassed — except organization
 * selection, which this product does not use (custom Studio / CNPJ flow).
 *
 * Clerk redirects to the configured `taskUrls` during sign-in, but a session
 * can also become pending afterwards (e.g. an admin forces a password reset)
 * or the user can deep-link into the app. This guard resolves the current task
 * and forwards the user to the matching route.
 *
 * `choose-organization` is ignored and sent to `/dashboard`. The guard stays
 * inert while Clerk loads, when signed out, when no (real) task is pending,
 * and while already inside the `/session-tasks` flow for MFA / password reset.
 */
export function SessionTaskGuard() {
  const { isLoaded, isSignedIn, session } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !session) return;

    const task = session.currentTask;
    if (!task) return;

    if (isBypassedSessionTask(task.key)) {
      if (isSessionTaskPath(pathname)) {
        router.replace(SESSION_TASK_COMPLETE_URL);
      }
      return;
    }

    if (!isSessionTaskKey(task.key)) return;

    if (isSessionTaskPath(pathname)) return;

    router.replace(SESSION_TASK_URLS[task.key]);
  }, [isLoaded, isSignedIn, session, pathname, router]);

  return null;
}
