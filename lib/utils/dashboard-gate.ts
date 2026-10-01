import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { ensurePerfilFromClerk, type LocalPerfil } from '@/lib/services/ensure-perfil';
import {
  dashboardPathForRole,
  ONBOARDING_PATH,
  parseAppRole,
  type AppRole,
} from '@/lib/utils/auth-redirect';

type GateResult = {
  clerkId: string;
  perfil: LocalPerfil | null;
  role: AppRole | null;
};

export async function requireDashboardSession(): Promise<GateResult> {
  const user = await currentUser();
  if (!user) {
    redirect('/login');
  }

  const metadata = (user.unsafeMetadata || user.publicMetadata || {}) as Record<string, unknown>;
  const role = parseAppRole(metadata.role as string | undefined);

  let perfil = null;
  try {
    perfil = await ensurePerfilFromClerk(user, role);
  } catch {
    perfil = null;
  }

  return {
    clerkId: user.id,
    perfil,
    role: parseAppRole(perfil?.role || role),
  };
}

export async function requireDashboardPerfil(expectedRole?: AppRole): Promise<LocalPerfil> {
  const { perfil, role } = await requireDashboardSession();

  if (!perfil || !role) {
    redirect(ONBOARDING_PATH);
  }

  if (perfil.deleted_at) {
    redirect('/login');
  }

  if (expectedRole && role !== expectedRole) {
    redirect(dashboardPathForRole(role));
  }

  return perfil;
}
