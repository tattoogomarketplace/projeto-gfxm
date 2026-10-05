'use client';

import { Suspense } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { DashboardRouteSkeleton } from '@/components/ui/dashboard-route-skeleton';

function AppShellFallback() {
  return (
    <div className="relative mx-auto min-h-screen w-full bg-neutral-50 pb-28 text-neutral-900 dark:bg-black dark:text-white">
      <header className="sticky top-0 z-40 shrink-0 border-b border-neutral-200 bg-neutral-50/80 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl dark:border-neutral-800 dark:bg-black/80">
        <div className="flex min-h-11 items-center px-4 pb-3">
          <span className="text-[17px] font-semibold tracking-tight">TattooGo MK</span>
        </div>
      </header>
      <DashboardRouteSkeleton />
    </div>
  );
}

export function AppShellBoundary({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <Suspense fallback={<AppShellFallback />}>
      <AppShell title={title}>{children}</AppShell>
    </Suspense>
  );
}
