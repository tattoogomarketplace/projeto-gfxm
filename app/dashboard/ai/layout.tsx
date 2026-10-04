import { requireDashboardPerfil } from '@/lib/utils/dashboard-gate';

export default async function DashboardAiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const perfil = await requireDashboardPerfil();
  if (!perfil) return null;
  return children;
}
