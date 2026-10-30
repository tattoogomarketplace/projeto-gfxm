export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { randomUUID } from 'crypto';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  ensurePerfilFromClerk,
  findPerfilByClerkId,
  isIdentityRoleTransitionAllowed,
  type LocalPerfil,
} from '@/lib/services/ensure-perfil';
import {
  buildProfileSource,
  describeRequestAuth,
  perfilResponse,
  resolvePerfilSession,
} from '@/lib/services/perfil-session';
import { isOnboardingComplete, parseAppRole, type AppRole } from '@/lib/utils/auth-redirect';
import { ensurePayloadSchema, invalidPayloadBody } from '@/lib/security/validation';

const ENSURE_STEP_TIMEOUT_MS = 4000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error('ensure-timeout')), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function fallbackEmail(userId: string, email?: string | null): string {
  const normalized = String(email || '').trim().toLowerCase();
  return normalized || `${userId}@tattoogo.local`;
}

function fallbackPerfilPayload(
  userId: string,
  email?: string | null,
  role?: AppRole | null
) {
  const resolvedEmail = fallbackEmail(userId, email);
  const resolvedRole = role ?? 'cliente';
  return {
    id: userId,
    email: resolvedEmail,
    nome: null as string | null,
    username: null as string | null,
    role: resolvedRole,
    kyc_status: (resolvedRole === 'cliente' ? 'nao_aplicavel' : 'pendente') as
      | 'nao_aplicavel'
      | 'pendente',
    has_seen_welcome_notice: true,
    onboarding_completed: true,
  };
}

function okWithPerfil(perfil: LocalPerfil) {
  const onboardingCompleted = isOnboardingComplete(perfil);
  return NextResponse.json({
    sucesso: true,
    reactivated: perfil.reactivated === true,
    needsOnboarding: !onboardingCompleted,
    onboarding_completed: onboardingCompleted,
    perfil: perfilResponse(perfil),
  });
}

function okWithFallback(
  userId: string,
  email?: string | null,
  role?: AppRole | null
) {
  const perfil = fallbackPerfilPayload(userId, email, role);
  return NextResponse.json({
    sucesso: true,
    reactivated: false,
    needsOnboarding: false,
    onboarding_completed: true,
    perfil,
  });
}

async function provisionBaselinePerfil(
  userId: string,
  email?: string | null,
  nome?: string | null,
  role?: AppRole | null
): Promise<LocalPerfil | null> {
  const resolvedEmail = fallbackEmail(userId, email);
  const resolvedRole = role ?? 'cliente';
  try {
    return await prisma.perfil.upsert({
      where: { clerk_id: userId },
      create: {
        id: randomUUID(),
        clerk_id: userId,
        email: resolvedEmail,
        nome: nome || null,
        role: resolvedRole,
        kyc_status: resolvedRole === 'cliente' ? 'nao_aplicavel' : 'pendente',
      },
      update: {
        deleted_at: null,
        agenda_bloqueada: false,
        ...(email ? { email: resolvedEmail } : {}),
        ...(nome ? { nome } : {}),
      },
      select: {
        id: true,
        clerk_id: true,
        email: true,
        nome: true,
        username: true,
        role: true,
        kyc_status: true,
        has_seen_welcome_notice: true,
        deleted_at: true,
      },
    });
  } catch (error) {
    console.error('[perfil/ensure] provisionamento baseline falhou', { userId, error });
    try {
      return await findPerfilByClerkId(userId);
    } catch {
      return null;
    }
  }
}

export async function GET(request: Request) {
  let userId: string | null = null;
  let email: string | null = null;
  let metadataRole: AppRole | null = null;

  try {
    try {
      ({ userId } = await withTimeout(auth(), ENSURE_STEP_TIMEOUT_MS));
    } catch (error) {
      console.error('[perfil/ensure] auth() falhou no GET', error);
      userId = null;
    }

    const session = await withTimeout(resolvePerfilSession(request), ENSURE_STEP_TIMEOUT_MS);
    userId = userId || session.userId;
    metadataRole = session.metadataRole;
    email =
      session.user?.primaryEmailAddress?.emailAddress ||
      session.user?.emailAddresses?.[0]?.emailAddress ||
      null;

    if (!userId) {
      console.error('[perfil/ensure] 401 - sessão não resolvida no GET', {
        ...describeRequestAuth(request),
        method: request.method,
      });
      return NextResponse.json(
        {
          sucesso: false,
          autenticado: false,
          erro: 'Não autenticado.',
          perfil: null,
          needsOnboarding: false,
        },
        { status: 401 }
      );
    }

    let perfil: LocalPerfil | null = null;
    try {
      perfil = await withTimeout(findPerfilByClerkId(userId), ENSURE_STEP_TIMEOUT_MS);
      const shouldReconcile =
        !perfil ||
        Boolean(perfil.deleted_at) ||
        Boolean(
          session.metadataRole &&
            perfil.role !== session.metadataRole &&
            isIdentityRoleTransitionAllowed(perfil.role, session.metadataRole, {
              deleted: Boolean(perfil.deleted_at),
            })
        );
      if (shouldReconcile) {
        perfil = await withTimeout(
          ensurePerfilFromClerk(
            buildProfileSource(userId, session.user),
            session.metadataRole
          ),
          ENSURE_STEP_TIMEOUT_MS
        );
      }
    } catch (error) {
      console.error('[perfil/ensure] auto-provisionamento falhou', { userId, error });
      perfil = null;
    }

    if (!perfil || perfil.deleted_at) {
      try {
        perfil = await withTimeout(
          provisionBaselinePerfil(
            userId,
            email,
            session.user?.fullName || session.user?.firstName || null,
            session.metadataRole
          ),
          ENSURE_STEP_TIMEOUT_MS
        );
      } catch (error) {
        console.error('[perfil/ensure] provisionamento baseline estourou timeout', { userId, error });
        perfil = null;
      }
    }

    if (!perfil || perfil.deleted_at) {
      console.error('[perfil/ensure] usando fallback 200 após falha de persistência', { userId });
      return okWithFallback(userId, email, metadataRole);
    }

    return okWithPerfil(perfil);
  } catch (error) {
    console.error('[perfil/ensure] GET inesperado; devolvendo fallback 200', { userId, error });
    if (!userId) {
      return NextResponse.json(
        {
          sucesso: false,
          autenticado: false,
          erro: 'Não autenticado.',
          perfil: null,
          needsOnboarding: false,
        },
        { status: 401 }
      );
    }
    return okWithFallback(userId, email, metadataRole);
  }
}

export async function POST(request: Request) {
  let userId: string | null = null;
  let email: string | null = null;
  let metadataRole: AppRole | null = null;

  try {
    try {
      ({ userId } = await withTimeout(auth(), ENSURE_STEP_TIMEOUT_MS));
    } catch {
      userId = null;
    }

    const session = await withTimeout(resolvePerfilSession(request), ENSURE_STEP_TIMEOUT_MS);
    userId = userId || session.userId;
    metadataRole = session.metadataRole;
    email =
      session.user?.primaryEmailAddress?.emailAddress ||
      session.user?.emailAddresses?.[0]?.emailAddress ||
      null;

    let rawBody: unknown = {};
    try {
      rawBody = await request.json();
    } catch {
      rawBody = {};
    }

    const parsed = ensurePayloadSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(invalidPayloadBody(parsed.error), { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ sucesso: false, erro: 'Não autenticado.' }, { status: 401 });
    }

    const requestedRole = parseAppRole(parsed.data.role);

    let existing: LocalPerfil | null = null;
    try {
      existing = await withTimeout(findPerfilByClerkId(userId), ENSURE_STEP_TIMEOUT_MS);
    } catch {
      existing = null;
    }

    const authoritativeRole = existing?.deleted_at
      ? session.metadataRole
      : existing?.role ?? session.metadataRole;

    if (
      authoritativeRole &&
      requestedRole &&
      requestedRole !== authoritativeRole &&
      !isIdentityRoleTransitionAllowed(authoritativeRole, requestedRole, {
        deleted: Boolean(existing?.deleted_at),
      })
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'O perfil é definido no cadastro e não pode ser alterado.',
          role: authoritativeRole,
        },
        { status: 403 }
      );
    }

    const role = requestedRole ?? authoritativeRole;
    let perfil: LocalPerfil | null = existing?.deleted_at ? null : existing;
    const needsRoleTransition = Boolean(
      perfil &&
        requestedRole &&
        perfil.role !== requestedRole &&
        isIdentityRoleTransitionAllowed(perfil.role, requestedRole, {
          deleted: Boolean(perfil.deleted_at),
        })
    );
    if (!perfil || needsRoleTransition) {
      try {
        perfil = await withTimeout(
          ensurePerfilFromClerk(
            buildProfileSource(userId, session.user),
            role ?? 'cliente'
          ),
          ENSURE_STEP_TIMEOUT_MS
        );
      } catch (error) {
        console.error('[perfil/ensure] criação falhou', { userId, role, error });
        perfil = null;
      }
    }

    if (!perfil || perfil.deleted_at) {
      try {
        perfil = await withTimeout(
          provisionBaselinePerfil(
            userId,
            email,
            session.user?.fullName || session.user?.firstName || null,
            session.metadataRole
          ),
          ENSURE_STEP_TIMEOUT_MS
        );
      } catch (error) {
        console.error('[perfil/ensure] POST provisionamento baseline estourou timeout', {
          userId,
          error,
        });
        perfil = null;
      }
    }

    if (!perfil || perfil.deleted_at) {
      console.error('[perfil/ensure] POST usando fallback 200', { userId });
      return okWithFallback(userId, email, metadataRole);
    }

    return okWithPerfil(perfil);
  } catch (error) {
    console.error('[perfil/ensure] POST inesperado; devolvendo fallback 200', { userId, error });
    if (!userId) {
      return NextResponse.json({ sucesso: false, erro: 'Não autenticado.' }, { status: 401 });
    }
    return okWithFallback(userId, email, metadataRole);
  }
}
