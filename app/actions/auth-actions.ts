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

type ClerkSessionLike = {
  id: string;
  userId?: string;
  status?: string;
};

function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const status = (error as { status?: number; statusCode?: number }).status
    ?? (error as { statusCode?: number }).statusCode;
  return status === 404;
}

function unwrapSessionList(list: unknown): ClerkSessionLike[] {
  if (Array.isArray(list)) return list as ClerkSessionLike[];
  if (list && typeof list === 'object' && 'data' in list) {
    const data = (list as { data?: unknown }).data;
    if (Array.isArray(data)) return data as ClerkSessionLike[];
  }
  return [];
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
  let authSessionId: string | null = null;
  try {
    const sessionAuth = await auth();
    userId = sessionAuth.userId ?? null;
    authSessionId = sessionAuth.sessionId ?? null;
  } catch {
    userId = null;
    authSessionId = null;
  }

  let sessionId = currentSessionId?.trim() || authSessionId;

  if (sessionId) {
    try {
      const session = await client.sessions.getSession(sessionId);
      if (!userId) {
        userId = session.userId;
      } else if (session.userId !== userId) {
        sessionId = null;
      }
    } catch {
      if (!userId || !authSessionId || sessionId !== authSessionId) {
        sessionId = null;
      }
    }
  }

  if (!sessionId || !userId) {
    return { ok: false, revoked: 0 };
  }

  let sessions: ClerkSessionLike[] = [];
  try {
    const list = await client.sessions.getSessionList({
      userId,
      status: 'active',
      limit: 100,
    });
    sessions = unwrapSessionList(list);
  } catch {
    try {
      const list = await client.sessions.getSessionList({
        userId,
        limit: 100,
      });
      sessions = unwrapSessionList(list).filter(
        (session) => session.status === 'active' || !session.status
      );
    } catch (error) {
      console.error('[auth] getSessionList failed', error);
      return { ok: false, revoked: 0 };
    }
  }

  const others = sessions.filter((session) => session.id !== sessionId);

  const revoked = await Promise.all(
    others.map((session) =>
      client.sessions.revokeSession(session.id).then(
        () => true,
        (error) => {
          console.error('[auth] revokeSession failed', session.id, error);
          return false;
        }
      )
    )
  );

  return { ok: true, revoked: revoked.filter(Boolean).length };
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
