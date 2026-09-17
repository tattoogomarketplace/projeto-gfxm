'use client';

import { Suspense } from 'react';
import { AppShell } from '@/components/layout/app-shell';

export function AppShellBoundary({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#121212]" />}>
      <AppShell title={title}>{children}</AppShell>
    </Suspense>
  );
}
