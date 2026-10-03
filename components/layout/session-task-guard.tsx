'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '@clerk/nextjs';
import {
  isSessionTaskKey,
  isSessionTaskPath,
  SESSION_TASK_URLS,
} from '@/lib/utils/session-tasks';

/**
 * Keeps pending Clerk session tasks from being bypassed.
 *
 * Clerk redirects to the configured `taskUrls` during sign-in, but a session
 * can also become pending afterwards (e.g. an admin forces a password reset)
 * or the user can deep-link into the app. This guard resolves the current task
 * and forwards the user to the matching route.
 *
 * It stays completely inert while Clerk loads, when signed out, when no task is
 * pending, and while already inside the `/session-tasks` flow, so it never
 * interferes with normal navigation.
 */
export function SessionTaskGuard() {
  const { isLoaded, isSignedIn, session } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !session) return;

    const task = session.currentTask;
    if (!task || !isSessionTaskKey(task.key)) return;

    const target = SESSION_TASK_URLS[task.key];
    if (isSessionTaskPath(pathname)) return;

    router.replace(target);
  }, [isLoaded, isSignedIn, session, pathname, router]);

  return null;
}
