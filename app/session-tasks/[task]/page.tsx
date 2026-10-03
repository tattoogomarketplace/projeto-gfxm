'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  TaskChooseOrganization,
  TaskResetPassword,
  TaskSetupMFA,
} from '@clerk/nextjs';
import {
  isSessionTaskKey,
  SESSION_TASK_COMPLETE_URL,
  type SessionTaskKey,
} from '@/lib/utils/session-tasks';

/**
 * Dynamic entry point for Clerk session tasks. The path segment selects which
 * task UI to render; Clerk remains the owner of the actual verification flow.
 */
export default function SessionTaskPage() {
  const params = useParams();
  const router = useRouter();

  const raw = params?.task;
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  const task: SessionTaskKey | null = isSessionTaskKey(candidate) ? candidate : null;

  useEffect(() => {
    if (!task) router.replace(SESSION_TASK_COMPLETE_URL);
  }, [task, router]);

  if (!task) return null;

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-[#121212] px-4 py-10">
      {task === 'choose-organization' ? (
        <TaskChooseOrganization redirectUrlComplete={SESSION_TASK_COMPLETE_URL} />
      ) : null}
      {task === 'reset-password' ? (
        <TaskResetPassword redirectUrlComplete={SESSION_TASK_COMPLETE_URL} />
      ) : null}
      {task === 'setup-mfa' ? (
        <TaskSetupMFA redirectUrlComplete={SESSION_TASK_COMPLETE_URL} />
      ) : null}
    </div>
  );
}
