export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { isValidCpf, onlyCpfDigits } from '@/lib/utils/cpf';

const MISMATCH_MESSAGE = 'E-mail ou CPF não conferem.';

type MetadataRecord = Record<string, unknown>;

function readCpfFromMetadata(metadata: unknown): string {
  if (!metadata || typeof metadata !== 'object') return '';
  return onlyCpfDigits(String((metadata as MetadataRecord).cpf || ''));
}

function cpfMatches(stored: string, provided: string): boolean {
  if (stored.length !== 11 || provided.length !== 11) return false;
  return timingSafeEqual(Buffer.from(stored), Buffer.from(provided));
}

function mismatchResponse(status: 400 | 404) {
  return NextResponse.json({ ok: false, error: MISMATCH_MESSAGE }, { status });
}

export async function POST(request: Request) {
  let body: { email?: unknown; cpf?: unknown } = {};
  try {
    body = (await request.json()) as { email?: unknown; cpf?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: 'Payload inválido.' }, { status: 400 });
  }

  const email = String(body.email || '')
    .trim()
    .toLowerCase();
  const cpf = onlyCpfDigits(typeof body.cpf === 'string' ? body.cpf : '');

  if (!email || !email.includes('@') || !email.includes('.')) {
    return NextResponse.json({ ok: false, error: 'E-mail inválido.' }, { status: 400 });
  }

  if (!isValidCpf(cpf)) {
    return NextResponse.json({ ok: false, error: 'CPF inválido.' }, { status: 400 });
  }

  try {
    const client = await clerkClient();
    const list = await client.users.getUserList({
      emailAddress: [email],
      limit: 10,
    });
    const users = Array.isArray(list) ? list : list.data || [];

    if (!users.length) {
      return mismatchResponse(404);
    }

    for (const user of users) {
      let storedCpf =
        readCpfFromMetadata(user.publicMetadata) ||
        readCpfFromMetadata(user.unsafeMetadata) ||
        readCpfFromMetadata(user.privateMetadata);

      if (storedCpf.length !== 11) {
        const perfil = await prisma.perfil.findFirst({
          where: {
            deleted_at: null,
            OR: [{ clerk_id: user.id }, { email }],
          },
          select: { cpf: true, clerk_id: true, email: true },
        });
        const sameIdentity =
          perfil?.clerk_id === user.id ||
          String(perfil?.email || '')
            .trim()
            .toLowerCase() === email;
        if (sameIdentity) {
          storedCpf = onlyCpfDigits(perfil?.cpf || '');
        }
      }

      if (cpfMatches(storedCpf, cpf)) {
        return NextResponse.json({ ok: true }, { status: 200 });
      }
    }

    return mismatchResponse(404);
  } catch (error) {
    console.error('[auth/verify-reset-credentials] falha', error);
    return NextResponse.json(
      { ok: false, error: 'Não foi possível validar as credenciais.' },
      { status: 500 }
    );
  }
}
