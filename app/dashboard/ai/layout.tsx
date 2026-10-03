import { requireDashboardPerfil } from '@/lib/utils/dashboard-gate';

export default async function DashboardAiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireDashboardPerfil();
  return children;
}
