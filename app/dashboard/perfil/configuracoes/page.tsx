'use client';

import { Suspense } from 'react';
import { SettingsHub } from '@/components/settings/settings-hub';
import { Skeleton } from '@/components/ui/skeleton';

function SettingsFallback() {
  return (
    <div className="min-h-full space-y-4 overflow-y-auto p-4 pb-32 sm:p-6">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
    </div>
  );
}

export default function ConfiguracoesPage() {
  return (
    <Suspense fallback={<SettingsFallback />}>
      <SettingsHub />
    </Suspense>
  );
}
