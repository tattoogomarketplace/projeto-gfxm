'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TaskResetPassword, TaskSetupMFA } from '@clerk/nextjs';
import {
  isBypassedSessionTask,
  isSessionTaskKey,
  SESSION_TASK_COMPLETE_URL,
  type SessionTaskKey,
} from '@/lib/utils/session-tasks';

/**
 * Dynamic entry point for Clerk session tasks. The path segment selects which
 * task UI to render; Clerk remains the owner of the actual verification flow.
 *
 * Organization selection is never rendered — users are sent to `/dashboard`
 * where the custom Studio / KYC onboarding lives.
 */
export default function SessionTaskPage() {
  const params = useParams();
  const router = useRouter();

  const raw = params?.task;
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  const bypassed = isBypassedSessionTask(candidate);
  const task: SessionTaskKey | null = isSessionTaskKey(candidate) ? candidate : null;

  useEffect(() => {
    if (!task || bypassed) router.push(SESSION_TASK_COMPLETE_URL);
  }, [task, bypassed, router]);

  if (!task || bypassed) return null;

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-[#121212] px-4 py-10">
      {task === 'reset-password' ? (
        <TaskResetPassword redirectUrlComplete={SESSION_TASK_COMPLETE_URL} />
      ) : null}
      {task === 'setup-mfa' ? (
        <TaskSetupMFA redirectUrlComplete={SESSION_TASK_COMPLETE_URL} />
      ) : null}
    </div>
  );
}
