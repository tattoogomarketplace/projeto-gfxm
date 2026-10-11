'use client';

import { memo } from 'react';
import { AppShell } from '@/components/layout/app-shell';

function AppShellBoundaryBase({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return <AppShell title={title}>{children}</AppShell>;
}

export const AppShellBoundary = memo(AppShellBoundaryBase);
