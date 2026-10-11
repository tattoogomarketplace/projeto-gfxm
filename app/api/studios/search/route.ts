export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolvePerfilSession } from '@/lib/services/perfil-session';
import { searchVerifiedStudios } from '@/lib/services/studio-affiliation';

export async function GET(request: Request) {
  const { userId } = await resolvePerfilSession(request);
  if (!userId) {
    return NextResponse.json({ sucesso: false, erro: 'Não autenticado.' }, { status: 401 });
  }

  const perfil = await prisma.perfil.findUnique({
    where: { clerk_id: userId },
    select: { role: true, deleted_at: true },
  });
  if (!perfil || perfil.deleted_at) {
    return NextResponse.json({ sucesso: false, erro: 'Perfil não encontrado.' }, { status: 404 });
  }
  if (perfil.role !== 'tatuador') {
    return NextResponse.json(
      { sucesso: false, erro: 'Apenas tatuadores podem buscar estúdios.' },
      { status: 403 }
    );
  }

  const q = new URL(request.url).searchParams.get('q') ?? '';
  const studios = await searchVerifiedStudios(q);
  return NextResponse.json({ sucesso: true, studios });
}
