'use client';

import { Suspense } from 'react';
import { SettingsHub } from '@/components/settings/settings-hub';
import { Skeleton } from '@/components/ui/skeleton';

function SettingsFallback() {
  return (
    <div className="relative flex flex-col overflow-hidden bg-background">
      <div className="shrink-0 py-4">
        <Skeleton className="h-16 w-full rounded-2xl" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col space-y-4 pt-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
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
