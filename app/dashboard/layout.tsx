import { AppShellBoundary } from '@/components/layout/app-shell-boundary';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[var(--background)]">
      <AppShellBoundary title="TattooGo MK">{children}</AppShellBoundary>
    </div>
  );
}
