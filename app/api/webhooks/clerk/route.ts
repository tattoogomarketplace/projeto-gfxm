export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse, type NextRequest } from 'next/server';
import { verifyWebhook } from '@clerk/nextjs/webhooks';
import { ensurePerfilFromClerk } from '@/lib/services/ensure-perfil';
import { normalizeAppRole, parseAppRole, type AppRole } from '@/lib/utils/auth-redirect';

type ClerkEmailAddress = {
  id?: string;
  email_address?: string;
};

type ClerkUnsafeMetadata = {
  role?: string;
  full_name?: string;
  nome?: string;
  cpf?: string;
  cnpj?: string;
  data_nascimento?: string;
  responsavel_nome?: string;
  responsavel_cpf?: string;
  accepted_terms?: boolean | string;
};

type ClerkUserCreatedData = {
  id?: string;
  first_name?: string | null;
  last_name?: string | null;
  primary_email_address_id?: string | null;
  email_addresses?: ClerkEmailAddress[];
  unsafe_metadata?: ClerkUnsafeMetadata;
  public_metadata?: ClerkUnsafeMetadata;
};

function resolveEmail(data: ClerkUserCreatedData): string {
  const addresses = data.email_addresses || [];
  const primary = addresses.find((item) => item.id && item.id === data.primary_email_address_id);
  return String(primary?.email_address || addresses[0]?.email_address || '')
    .trim()
    .toLowerCase();
}

function resolveRole(data: ClerkUserCreatedData): AppRole {
  const metadata = data.unsafe_metadata || data.public_metadata || {};
  return parseAppRole(metadata.role) ?? normalizeAppRole(metadata.role);
}

export async function POST(request: NextRequest) {
  let event: { type?: string; data?: ClerkUserCreatedData };
  try {
    event = (await verifyWebhook(request, {
      signingSecret: process.env.CLERK_WEBHOOK_SIGNING_SECRET || process.env.CLERK_WEBHOOK_SECRET,
    })) as { type?: string; data?: ClerkUserCreatedData };
  } catch {
    return NextResponse.json({ error: 'Assinatura Svix inválida.' }, { status: 400 });
  }

  if (event.type !== 'user.created' && event.type !== 'user.updated') {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const data = event.data || {};
  const clerkId = String(data.id || '').trim();
  const email = resolveEmail(data);

  if (!clerkId) {
    return NextResponse.json({ received: true, skipped: 'missing_clerk_id' }, { status: 200 });
  }

  const metadata = data.unsafe_metadata || data.public_metadata || {};
  const role = resolveRole(data);

  try {
    await ensurePerfilFromClerk(
      {
        id: clerkId,
        firstName: data.first_name,
        lastName: data.last_name,
        primaryEmailAddress: email ? { emailAddress: email } : null,
        emailAddresses: (data.email_addresses || [])
          .map((item) => ({ emailAddress: item.email_address || null }))
          .filter((item) => item.emailAddress),
        unsafeMetadata: metadata,
        publicMetadata: data.public_metadata || {},
      },
      role
    );
  } catch {
    return NextResponse.json({ received: true, deferred: true }, { status: 200 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
