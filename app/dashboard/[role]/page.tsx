import { redirect } from 'next/navigation';
import { SessionHydrating } from '@/components/features/session-hydrating';
import { requireDashboardPerfil } from '@/lib/utils/dashboard-gate';
import { rethrowNextControlFlow } from '@/lib/utils/next-control-flow';
import { parseAppRole } from '@/lib/utils/auth-redirect';
import { getRoleExperience } from '@/lib/content/role-experience';
import { t } from '@/lib/i18n';
import { resolveDisplayName } from '@/lib/utils/display-name';

interface DashboardPageProps {
  params: Promise<{ role: string }>;
}

export default async function DashboardRolePage({ params }: DashboardPageProps) {
  const { role } = await params;
  const expectedRole = parseAppRole(role);
  if (!expectedRole) {
    redirect('/dashboard');
  }

  let perfil = null;
  try {
    perfil = await requireDashboardPerfil(expectedRole);
  } catch (error) {
    rethrowNextControlFlow(error);
    console.error('[dashboard/role] sessão indisponível', error);
    return <SessionHydrating />;
  }
  if (!perfil) return <SessionHydrating />;
  const experience = getRoleExperience(perfil?.role ?? expectedRole);

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">{t(experience.dashboard.title)}</h1>
        <p className="text-sm text-zinc-400">{t(experience.dashboard.subtitle)}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="h-40 rounded-2xl border border-black/[0.04] bg-white p-6 shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03] dark:shadow-none">
          <p className="text-zinc-400">{t('welcome.hello', { name: resolveDisplayName(undefined, t('welcome.artistFallback'), perfil?.nome) })}</p>
        </div>
      </div>
    </div>
  );
}
