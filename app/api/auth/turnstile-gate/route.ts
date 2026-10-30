export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveClientIp, verifyTurnstileToken } from '@/lib/security/turnstile';
import { turnstileTokenSchema } from '@/lib/security/validation';

const payloadSchema = z
  .object({
    turnstileToken: turnstileTokenSchema,
  })
  .strict();

const FORBIDDEN = {
  sucesso: false as const,
  erro: 'Falha na verificação anti-bot. Recarregue a página e tente novamente.',
  codigo: 'TURNSTILE_REQUIRED' as const,
};

export async function POST(request: Request) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(FORBIDDEN, { status: 403 });
  }

  const parsed = payloadSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(FORBIDDEN, { status: 403 });
  }

  const turnstile = await verifyTurnstileToken(
    parsed.data.turnstileToken,
    resolveClientIp(request)
  );
  if (turnstile.configured && !turnstile.success) {
    return NextResponse.json(FORBIDDEN, { status: 403 });
  }

  return NextResponse.json({ sucesso: true }, { status: 200 });
}
