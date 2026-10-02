import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import {
  ensurePerfilFromClerk,
  findPerfilByClerkId,
  type LocalPerfil,
} from '@/lib/services/ensure-perfil';
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
  const { userId } = await auth();
  if (!userId) {
    redirect(ONBOARDING_PATH);
  }

  const user = await currentUser().catch(() => null);
  const metadata = (user?.unsafeMetadata || user?.publicMetadata || {}) as Record<string, unknown>;
  const role = parseAppRole(metadata.role as string | undefined);

  let perfil: LocalPerfil | null = null;
  try {
    if (user) {
      perfil = await ensurePerfilFromClerk(user, role);
    }
    if (!perfil) {
      perfil = await findPerfilByClerkId(userId);
    }
  } catch {
    perfil = null;
  }

  return {
    clerkId: userId,
    perfil,
    role: parseAppRole(perfil?.role || role),
  };
}

export async function requireDashboardPerfil(expectedRole?: AppRole): Promise<LocalPerfil> {
  const { perfil, role } = await requireDashboardSession();

  if (!perfil || perfil.deleted_at || !role) {
    redirect(ONBOARDING_PATH);
  }

  // Espelho da trava do layout: o painel só é liberado após o onboarding ser
  // confirmado no banco. Reforça o bloqueio mesmo que a rota seja acessada
  // diretamente pela URL.
  if (!perfil.has_seen_welcome_notice) {
    redirect(ONBOARDING_PATH);
  }

  if (expectedRole && role !== expectedRole) {
    redirect(dashboardPathForRole(role));
  }

  return perfil;
}
