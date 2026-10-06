'use client';

import { Suspense } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { DashboardRouteSkeleton } from '@/components/ui/dashboard-route-skeleton';

function AppShellFallback() {
  return (
    <div className="luxury-canvas nav-safe-pad relative mx-auto flex h-full max-h-full w-full flex-col overflow-hidden overscroll-none pb-28 text-neutral-900 transition-opacity duration-300 ease-in-out dark:text-white">
      <header className="z-40 shrink-0 border-b border-neutral-200/80 bg-[#FFFDF9] pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl dark:border-white/10 dark:bg-[#121212]">
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
    <>
      <Suspense fallback={<AppShellFallback />}>
        <AppShell title={title}>{children}</AppShell>
      </Suspense>
    </>
  );
}
