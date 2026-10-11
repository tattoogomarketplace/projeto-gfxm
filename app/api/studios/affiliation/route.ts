export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolvePerfilSession } from '@/lib/services/perfil-session';
import {
  AffiliationError,
  decideAffiliation,
  getStudioCompliance,
  listForEstudio,
  listForTatuador,
  requestAffiliation,
} from '@/lib/services/studio-affiliation';

async function loadActor(clerkId: string) {
  return prisma.perfil.findUnique({
    where: { clerk_id: clerkId },
    select: { id: true, role: true, deleted_at: true },
  });
}

export async function GET(request: Request) {
  const { userId } = await resolvePerfilSession(request);
  if (!userId) {
    return NextResponse.json({ sucesso: false, erro: 'Não autenticado.' }, { status: 401 });
  }

  const actor = await loadActor(userId);
  if (!actor || actor.deleted_at) {
    return NextResponse.json({ sucesso: false, erro: 'Perfil não encontrado.' }, { status: 404 });
  }

  if (actor.role === 'tatuador') {
    const payload = await listForTatuador(actor.id);
    return NextResponse.json({ sucesso: true, role: actor.role, ...payload });
  }

  if (actor.role === 'estudio') {
    const [payload, compliance] = await Promise.all([
      listForEstudio(actor.id),
      getStudioCompliance(actor.id),
    ]);
    return NextResponse.json({ sucesso: true, role: actor.role, compliance, ...payload });
  }

  return NextResponse.json(
    { sucesso: false, erro: 'Afiliação disponível apenas para tatuadores e estúdios.' },
    { status: 403 }
  );
}

export async function POST(request: Request) {
  const { userId } = await resolvePerfilSession(request);
  if (!userId) {
    return NextResponse.json({ sucesso: false, erro: 'Não autenticado.' }, { status: 401 });
  }

  const actor = await loadActor(userId);
  if (!actor || actor.deleted_at) {
    return NextResponse.json({ sucesso: false, erro: 'Perfil não encontrado.' }, { status: 404 });
  }
  if (actor.role !== 'tatuador') {
    return NextResponse.json(
      { sucesso: false, erro: 'Apenas tatuadores independentes podem solicitar afiliação.' },
      { status: 403 }
    );
  }

  let body: { estudio_id?: unknown } = {};
  try {
    body = (await request.json()) as { estudio_id?: unknown };
  } catch {
    return NextResponse.json({ sucesso: false, erro: 'Payload inválido.' }, { status: 400 });
  }

  const estudioId = typeof body.estudio_id === 'string' ? body.estudio_id.trim() : '';
  try {
    const result = await requestAffiliation(actor.id, estudioId);
    return NextResponse.json({ sucesso: true, ...result }, { status: result.reused ? 200 : 201 });
  } catch (error) {
    if (error instanceof AffiliationError) {
      return NextResponse.json({ sucesso: false, erro: error.message }, { status: error.status });
    }
    console.error('[studios/affiliation] falha ao criar pedido', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { sucesso: false, erro: 'Falha ao solicitar afiliação.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const { userId } = await resolvePerfilSession(request);
  if (!userId) {
    return NextResponse.json({ sucesso: false, erro: 'Não autenticado.' }, { status: 401 });
  }

  const actor = await loadActor(userId);
  if (!actor || actor.deleted_at) {
    return NextResponse.json({ sucesso: false, erro: 'Perfil não encontrado.' }, { status: 404 });
  }

  let body: { convite_id?: unknown; action?: unknown } = {};
  try {
    body = (await request.json()) as { convite_id?: unknown; action?: unknown };
  } catch {
    return NextResponse.json({ sucesso: false, erro: 'Payload inválido.' }, { status: 400 });
  }

  const conviteId = typeof body.convite_id === 'string' ? body.convite_id.trim() : '';
  const action = body.action === 'accept' || body.action === 'reject' || body.action === 'cancel'
    ? body.action
    : null;
  if (!action) {
    return NextResponse.json({ sucesso: false, erro: 'Ação inválida.' }, { status: 400 });
  }

  try {
    const result = await decideAffiliation(
      { id: actor.id, role: actor.role },
      conviteId,
      action
    );
    return NextResponse.json({ sucesso: true, ...result });
  } catch (error) {
    if (error instanceof AffiliationError) {
      return NextResponse.json({ sucesso: false, erro: error.message }, { status: error.status });
    }
    console.error('[studios/affiliation] falha ao decidir pedido', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { sucesso: false, erro: 'Falha ao atualizar o pedido.' },
      { status: 500 }
    );
  }
}
