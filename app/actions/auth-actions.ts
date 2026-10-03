'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';

export interface EnforceSingleSessionResult {
  ok: boolean;
  revoked: number;
}

export interface SessionValidityResult {
  /**
   * `active`   – session confirmed alive on Clerk's side.
   * `revoked`  – session explicitly ended/revoked on another device.
   * `unknown`  – could not resolve the session (missing cookie, network issue);
   *              the caller must NOT treat this as a kick.
   */
  status: 'active' | 'revoked' | 'unknown';
}

function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const status = (error as { status?: number; statusCode?: number }).status
    ?? (error as { statusCode?: number }).statusCode;
  return status === 404;
}

/**
 * Strict single-device policy: revoke every active session of the current user
 * except the one that just authenticated.
 *
 * `currentSessionId` is passed by the login flow because the freshly created
 * session cookie may not be visible to the server action instantly. The id is
 * validated against the Clerk Backend API (and matched to the authenticated
 * user when `auth()` resolves) before any revocation happens.
 */
export async function enforceSingleSession(
  currentSessionId?: string
): Promise<EnforceSingleSessionResult> {
  const client = await clerkClient();

  let userId: string | null = null;
  try {
    ({ userId } = await auth());
  } catch {
    userId = null;
  }

  let sessionId = currentSessionId?.trim() || null;

  if (sessionId) {
    try {
      const session = await client.sessions.getSession(sessionId);
      if (!userId) {
        userId = session.userId;
      } else if (session.userId !== userId) {
        sessionId = null;
      }
    } catch {
      sessionId = null;
    }
  }

  if (!sessionId || !userId) {
    return { ok: false, revoked: 0 };
  }

  const { data } = await client.sessions.getSessionList({
    userId,
    status: 'active',
    limit: 100,
  });
  const others = data.filter((session) => session.id !== sessionId);

  await Promise.all(
    others.map((session) =>
      client.sessions.revokeSession(session.id).catch(() => null)
    )
  );

  return { ok: true, revoked: others.length };
}

/**
 * Verifies that the session embedded in the current request is still active on
 * Clerk's side. Used by the client guard to detect a remote revocation before
 * the session token expires, so the kick modal can be shown in real time.
 */
export async function checkCurrentSession(): Promise<SessionValidityResult> {
  let userId: string | null = null;
  let sessionId: string | null = null;

  try {
    ({ userId, sessionId } = await auth());
  } catch {
    return { status: 'unknown' };
  }

  if (!userId || !sessionId) {
    return { status: 'unknown' };
  }

  try {
    const client = await clerkClient();
    const session = await client.sessions.getSession(sessionId);
    return { status: session.status === 'active' ? 'active' : 'revoked' };
  } catch (error) {
    return { status: isNotFoundError(error) ? 'revoked' : 'unknown' };
  }
}
