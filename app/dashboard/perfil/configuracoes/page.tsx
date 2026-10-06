'use client';

import { Suspense } from 'react';
import { SettingsHub } from '@/components/settings/settings-hub';
import { Skeleton } from '@/components/ui/skeleton';

function SettingsFallback() {
  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-4 overflow-y-auto px-4 pt-4 pb-40 sm:px-6 sm:pt-6">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
    </div>
  );
}

export default function ConfiguracoesPage() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <Suspense fallback={<SettingsFallback />}>
        <SettingsHub />
      </Suspense>
    </div>
  );
}
