export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { ensurePerfilFromClerk } from '@/lib/services/ensure-perfil';
import { parseAppRole } from '@/lib/utils/auth-redirect';

export async function GET() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ sucesso: false, erro: 'Não autenticado.' }, { status: 401 });
  }

  const metadata = (user.unsafeMetadata || user.publicMetadata || {}) as Record<string, unknown>;
  const role = parseAppRole(metadata.role as string | undefined);

  let perfil;
  try {
    perfil = await ensurePerfilFromClerk(user, role);
  } catch {
    return NextResponse.json(
      { sucesso: true, perfil: null, needsOnboarding: true },
      { status: 200 }
    );
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
    perfil: {
      id: perfil.id,
      email: perfil.email,
      nome: perfil.nome,
      role: perfil.role,
      kyc_status: perfil.kyc_status,
    },
  });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ sucesso: false, erro: 'Não autenticado.' }, { status: 401 });
  }

  let body: { role?: string } = {};
  try {
    body = (await request.json()) as { role?: string };
  } catch {
    body = {};
  }

  const requestedRole = parseAppRole(body.role);
  const metadata = (user.unsafeMetadata || user.publicMetadata || {}) as Record<string, unknown>;
  const metadataRole = parseAppRole(metadata.role as string | undefined);
  const role = requestedRole || metadataRole;

  if (!role) {
    return NextResponse.json(
      { sucesso: false, erro: 'Selecione um perfil para continuar.', needsOnboarding: true },
      { status: 400 }
    );
  }

  let perfil;
  try {
    perfil = await ensurePerfilFromClerk(user, role);
  } catch {
    perfil = null;
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
    perfil: {
      id: perfil.id,
      email: perfil.email,
      nome: perfil.nome,
      role: perfil.role,
      kyc_status: perfil.kyc_status,
    },
  });
}
