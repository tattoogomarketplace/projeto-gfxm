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
  let userId: string | null = null;
  let user = null;
  let metadataRole = null;

  try {
    const session = await resolvePerfilSessionFromIncomingRequest();
    userId = session.userId;
    user = session.user;
    metadataRole = session.metadataRole;
  } catch (error) {
    console.error('[dashboard-gate] sessão Clerk indisponível', error);
    return null;
  }

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
  } catch (error) {
    console.error('[dashboard-gate] prisma findPerfilByClerkId falhou', error);
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

  if (!perfil || perfil.deleted_at) {
    return {
      id: session.clerkId,
      clerk_id: session.clerkId,
      email: `${session.clerkId}@tattoogo.local`,
      nome: null,
      role: expectedRole ?? 'cliente',
      kyc_status: expectedRole === 'cliente' || !expectedRole ? 'nao_aplicavel' : 'pendente',
      has_seen_welcome_notice: true,
      deleted_at: null,
    };
  }

  if (!role || !isOnboardingComplete(perfil)) {
    redirect(ONBOARDING_PATH);
  }

  if (expectedRole && role !== expectedRole) {
    redirect(dashboardPathForRole(role));
  }

  return perfil;
}
