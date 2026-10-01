export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import {
  ensurePerfilFromClerk,
  findPerfilByClerkId,
  type LocalPerfil,
} from '@/lib/services/ensure-perfil';
import { parseAppRole, type AppRole } from '@/lib/utils/auth-redirect';

type ClerkUser = Awaited<ReturnType<typeof currentUser>>;

type SessionContext = {
  userId: string | null;
  user: ClerkUser;
  metadataRole: AppRole | null;
};

/**
 * Estabelece a sessão a partir do token (auth) e, de forma defensiva, tenta
 * enriquecer com os metadados do usuário Clerk (currentUser). O gate de
 * autenticação é o `auth()` — leve, síncrono com o JWT e o padrão do App
 * Router — enquanto `currentUser()` é apenas complementar. Isso evita que uma
 * falha transitória da Backend API derrube a sessão com um 401 indevido.
 */
async function resolveSession(): Promise<SessionContext> {
  const { userId } = await auth();
  if (!userId) {
    return { userId: null, user: null, metadataRole: null };
  }

  let user: ClerkUser = null;
  try {
    user = await currentUser();
  } catch {
    user = null;
  }

  const metadata = (user?.unsafeMetadata || user?.publicMetadata || {}) as Record<string, unknown>;
  return { userId, user, metadataRole: parseAppRole(metadata.role as string | undefined) };
}

function perfilResponse(perfil: LocalPerfil) {
  return {
    id: perfil.id,
    email: perfil.email,
    nome: perfil.nome,
    role: perfil.role,
    kyc_status: perfil.kyc_status,
  };
}

export async function GET() {
  const { userId, user, metadataRole } = await resolveSession();
  if (!userId) {
    return NextResponse.json({ sucesso: false, erro: 'Não autenticado.' }, { status: 401 });
  }

  let perfil: LocalPerfil | null = null;
  try {
    perfil = await findPerfilByClerkId(userId);
    if (!perfil && user) {
      perfil = await ensurePerfilFromClerk(user, metadataRole);
    }
  } catch {
    perfil = null;
  }

  if (!perfil) {
    return NextResponse.json(
      { sucesso: true, perfil: null, needsOnboarding: true },
      { status: 200 }
    );
  }

  if (perfil.deleted_at) {
    return NextResponse.json(
      { sucesso: false, erro: 'Conta desativada.', perfil: null },
      { status: 403 }
    );
  }

  return NextResponse.json({
    sucesso: true,
    needsOnboarding: false,
    perfil: perfilResponse(perfil),
  });
}

export async function POST(request: Request) {
  const { userId, user, metadataRole } = await resolveSession();
  if (!userId) {
    return NextResponse.json({ sucesso: false, erro: 'Não autenticado.' }, { status: 401 });
  }

  let body: { role?: string } = {};
  try {
    body = (await request.json()) as { role?: string };
  } catch {
    body = {};
  }

  const requestedRole = parseAppRole(body.role);

  let existing: LocalPerfil | null = null;
  try {
    existing = await findPerfilByClerkId(userId);
  } catch {
    existing = null;
  }

  if (existing?.deleted_at) {
    return NextResponse.json(
      { sucesso: false, erro: 'Conta desativada.', perfil: null },
      { status: 403 }
    );
  }

  // Fonte de verdade do papel: o perfil já persistido no banco tem prioridade
  // absoluta; na primeira criação vale o papel escolhido no cadastro (metadata).
  const authoritativeRole = existing?.role ?? metadataRole;

  if (authoritativeRole && requestedRole && requestedRole !== authoritativeRole) {
    return NextResponse.json(
      {
        sucesso: false,
        erro: 'O perfil é definido no cadastro e não pode ser alterado.',
        role: authoritativeRole,
      },
      { status: 403 }
    );
  }

  const role = authoritativeRole ?? requestedRole;
  if (!role) {
    return NextResponse.json(
      { sucesso: false, erro: 'Selecione um perfil para continuar.', needsOnboarding: true },
      { status: 400 }
    );
  }

  let perfil: LocalPerfil | null = existing;
  if (!perfil) {
    if (!user) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Não foi possível validar sua conta agora. Tente novamente.',
          needsOnboarding: true,
        },
        { status: 409 }
      );
    }
    try {
      perfil = await ensurePerfilFromClerk(user, role);
    } catch {
      perfil = null;
    }
  }

  if (!perfil) {
    return NextResponse.json(
      { sucesso: false, erro: 'Não foi possível criar o perfil local.', needsOnboarding: true },
      { status: 409 }
    );
  }

  return NextResponse.json({
    sucesso: true,
    needsOnboarding: false,
    perfil: perfilResponse(perfil),
  });
}
