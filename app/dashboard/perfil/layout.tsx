'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ProfileView } from '@/components/features/profile-view';
import { SettingsHub } from '@/components/settings/settings-hub';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { cn } from '@/lib/utils';

export default function PerfilLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isSettings = pathname.startsWith('/dashboard/perfil/configuracoes');

  useEffect(() => {
    router.prefetch('/dashboard/perfil');
    router.prefetch('/dashboard/perfil/configuracoes');
  }, [router]);

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden">
      <div
        className={cn(
          'flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden',
          isSettings
            ? 'pointer-events-none absolute inset-0 opacity-0'
            : 'relative opacity-100'
        )}
        aria-hidden={isSettings}
        inert={isSettings ? true : undefined}
      >
        <ErrorBoundary>
          <ProfileView />
        </ErrorBoundary>
      </div>

      <div
        className={cn(
          'flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden',
          isSettings
            ? 'relative opacity-100'
            : 'pointer-events-none absolute inset-0 opacity-0'
        )}
        aria-hidden={!isSettings}
        inert={!isSettings ? true : undefined}
      >
        <SettingsHub />
      </div>

      <div className="hidden" aria-hidden>
        {children}
      </div>
    </div>
  );
}
