'use client';

import { AppShell } from '@/components/layout/app-shell';

export function AppShellBoundary({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return <AppShell title={title}>{children}</AppShell>;
}
