'use client';

import { DashboardRouteSkeleton } from '@/components/ui/dashboard-route-skeleton';

export function SessionHydrating({ label = 'Carregando sessão...' }: { label?: string }) {
  void label;
  return <DashboardRouteSkeleton />;
}
