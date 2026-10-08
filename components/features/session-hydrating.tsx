'use client';

import { memo } from 'react';
import { DashboardRouteSkeleton } from '@/components/ui/dashboard-route-skeleton';

function SessionHydratingBase({ label = 'Carregando sessão...' }: { label?: string }) {
  void label;
  return <DashboardRouteSkeleton />;
}

export const SessionHydrating = memo(SessionHydratingBase);
