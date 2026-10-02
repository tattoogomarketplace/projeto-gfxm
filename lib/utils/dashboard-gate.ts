import { redirect } from 'next/navigation';
import {
  ensurePerfilFromClerk,
  findPerfilByClerkId,
  type LocalPerfil,
} from '@/lib/services/ensure-perfil';
import { buildProfileSource, resolvePerfilSessionFromIncomingRequest } from '@/lib/services/perfil-session';
import {
  dashboardPathForRole,
  isOnboardingComplete,
  LOGIN_PATH,
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
  const { userId, user, metadataRole } = await resolvePerfilSessionFromIncomingRequest();
  if (!userId) {
    redirect(LOGIN_PATH);
  }

  let perfil: LocalPerfil | null = null;
  try {
    perfil = await findPerfilByClerkId(userId);
    if (!perfil) {
      perfil = await ensurePerfilFromClerk(buildProfileSource(userId, user), metadataRole);
    }
  } catch {
    perfil = null;
  }

  return {
    clerkId: userId,
    perfil,
    role: parseAppRole(perfil?.role || metadataRole),
  };
}

export async function requireDashboardPerfil(expectedRole?: AppRole): Promise<LocalPerfil> {
  const { perfil, role } = await requireDashboardSession();

  if (!perfil || perfil.deleted_at || !role || !isOnboardingComplete(perfil)) {
    redirect(ONBOARDING_PATH);
  }

  if (expectedRole && role !== expectedRole) {
    redirect(dashboardPathForRole(role));
  }

  return perfil;
}
