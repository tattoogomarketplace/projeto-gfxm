'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ProfileView } from '@/components/features/profile-view';
import { SettingsHub } from '@/components/settings/settings-hub';
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
    <div className="gpu-layer relative flex h-full min-h-0 w-full flex-col overflow-hidden contain-paint transform-gpu backface-hidden will-change-transform">
      <div
        className={cn(
          'gpu-layer flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden contain-paint transform-gpu backface-hidden will-change-transform transition-transform transition-opacity duration-300 ease-out',
          isSettings
            ? 'pointer-events-none absolute inset-0 opacity-0 -translate-x-2'
            : 'relative opacity-100 translate-x-0'
        )}
        aria-hidden={isSettings}
        inert={isSettings ? true : undefined}
      >
        <ProfileView />
      </div>

      <div
        className={cn(
          'gpu-layer flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden contain-paint transform-gpu backface-hidden will-change-transform transition-transform transition-opacity duration-300 ease-out',
          isSettings
            ? 'relative opacity-100 translate-x-0'
            : 'pointer-events-none absolute inset-0 opacity-0 translate-x-2'
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
