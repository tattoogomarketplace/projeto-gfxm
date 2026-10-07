import { headers } from 'next/headers';
import { AppShellBoundary } from '@/components/layout/app-shell-boundary';
import { isOnboardingPath } from '@/lib/utils/auth-redirect';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="luxury-canvas relative flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden overscroll-none bg-background text-neutral-900 select-none dark:text-white">
      <AppShellBoundary title="TattooGo MK">{children}</AppShellBoundary>
    </div>
  );
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get('x-pathname') ?? '';
  const isOnboarding = isOnboardingPath(pathname);
  const isKycPendentePath =
    pathname === '/dashboard/kyc-pendente' || pathname.startsWith('/dashboard/kyc-pendente/');
  const isArtistVerificationPath =
    pathname === '/dashboard/seja-tatuador' || pathname.startsWith('/dashboard/seja-tatuador/');

  if (isOnboarding || isKycPendentePath || isArtistVerificationPath) {
    return <>{children}</>;
  }

  return <DashboardShell>{children}</DashboardShell>;
}
