export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { prisma } from '@/lib/prisma';
import { normalizeAppRole, type AppRole } from '@/lib/utils/auth-redirect';

type ClerkEmailAddress = {
  email_address?: string;
};

type ClerkUnsafeMetadata = {
  role?: string;
  full_name?: string;
  nome?: string;
  cpf?: string;
};

type ClerkUserCreatedData = {
  id?: string;
  first_name?: string | null;
  last_name?: string | null;
  email_addresses?: ClerkEmailAddress[];
  unsafe_metadata?: ClerkUnsafeMetadata;
};

type ClerkWebhookEvent = {
  type?: string;
  data?: ClerkUserCreatedData;
};

function resolveNome(data: ClerkUserCreatedData): string | null {
  const metadata = data.unsafe_metadata || {};
  const fromMetadata = String(metadata.full_name || metadata.nome || '').trim();
  if (fromMetadata) return fromMetadata;

  const fromClerk = [data.first_name, data.last_name]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' ')
    .trim();

  return fromClerk || null;
}

function resolveCpf(data: ClerkUserCreatedData): string | null {
  const digits = String(data.unsafe_metadata?.cpf || '').replace(/\D/g, '');
  return digits.length === 11 ? digits : null;
}

function resolveRole(data: ClerkUserCreatedData): AppRole {
  return normalizeAppRole(data.unsafe_metadata?.role);
}

export async function POST(request: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret ausente.' }, { status: 400 });
  }

  const payload = await request.text();
  const svixId = request.headers.get('svix-id');
  const svixTimestamp = request.headers.get('svix-timestamp');
  const svixSignature = request.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Headers Svix ausentes.' }, { status: 400 });
  }

  let event: ClerkWebhookEvent;
  try {
    const webhook = new Webhook(secret);
    event = webhook.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent;
  } catch {
    return NextResponse.json({ error: 'Assinatura Svix inválida.' }, { status: 400 });
  }

  if (event.type !== 'user.created') {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const data = event.data || {};
  const clerkId = String(data.id || '').trim();
  const email = String(data.email_addresses?.[0]?.email_address || '')
    .trim()
    .toLowerCase();

  if (!clerkId || !email) {
    return NextResponse.json({ error: 'Payload Clerk incompleto.' }, { status: 400 });
  }

  const existing = await prisma.perfil.findUnique({
    where: { clerk_id: clerkId },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json({ received: true, duplicated: true }, { status: 200 });
  }

  await prisma.perfil.create({
    data: {
      id: randomUUID(),
      clerk_id: clerkId,
      email,
      nome: resolveNome(data),
      role: resolveRole(data),
      cpf: resolveCpf(data),
    },
  });

  return NextResponse.json({ received: true }, { status: 200 });
}
