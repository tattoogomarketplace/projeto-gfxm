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
  ONBOARDING_PATH,
  parseAppRole,
  type AppRole,
} from '@/lib/utils/auth-redirect';

type GateResult = {
  clerkId: string;
  perfil: LocalPerfil | null;
  role: AppRole | null;
};

export async function requireDashboardSession(): Promise<GateResult | null> {
  const { userId, user, metadataRole } = await resolvePerfilSessionFromIncomingRequest();
  if (!userId) {
    return null;
  }

  let perfil: LocalPerfil | null = null;
  try {
    perfil = await findPerfilByClerkId(userId);
    const shouldReconcile =
      !perfil ||
      Boolean(perfil.deleted_at) ||
      Boolean(
        metadataRole &&
          perfil.role !== metadataRole &&
          parseAppRole(perfil.role) === 'cliente' &&
          (metadataRole === 'tatuador' || metadataRole === 'estudio')
      );
    if (shouldReconcile) {
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

export async function requireDashboardPerfil(expectedRole?: AppRole): Promise<LocalPerfil | null> {
  const session = await requireDashboardSession();
  if (!session) return null;

  const { perfil, role } = session;

  if (!perfil || perfil.deleted_at || !role || !isOnboardingComplete(perfil)) {
    redirect(ONBOARDING_PATH);
  }

  if (expectedRole && role !== expectedRole) {
    redirect(dashboardPathForRole(role));
  }

  return perfil;
}
