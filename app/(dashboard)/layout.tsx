import { AppShellBoundary } from '@/components/layout/app-shell-boundary';

export default function GroupDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShellBoundary title="TattooGo MK">{children}</AppShellBoundary>;
}
