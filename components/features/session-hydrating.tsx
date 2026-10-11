'use client';

import { memo } from 'react';
import { DashboardRouteSkeleton } from '@/components/ui/dashboard-route-skeleton';
import { useI18n } from '@/hooks/use-i18n';

function SessionHydratingBase({ label }: { label?: string }) {
  const { t } = useI18n();
  const resolvedLabel = label ?? t('session.loading');
  void resolvedLabel;
  return <DashboardRouteSkeleton />;
}

export const SessionHydrating = memo(SessionHydratingBase);
