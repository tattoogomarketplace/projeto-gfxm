'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useUiStore, type AppTab } from '@/hooks/use-ui-store';
import { useOfflineQueue } from '@/hooks/use-offline-queue';
import { UserIdentity } from '@/components/layout/user-identity';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { cn } from '@/lib/utils';

const TABS: { value: AppTab; label: string }[] = [
  { value: 'portfolio', label: 'Portfólio' },
  { value: 'agendar', label: 'Agendar' },
  { value: 'chat', label: 'Chat' },
];

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
}

export function AppShell({ children, title = 'TattooGo MK' }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = useUiStore((s) => s.activeTab);
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const isOnline = useOfflineQueue((s) => s.isOnline);
  const pending = useOfflineQueue((s) => s.queue.length);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'portfolio' || tab === 'agendar' || tab === 'chat') {
      setActiveTab(tab);
    }
  }, [searchParams, setActiveTab]);

  const handleTabChange = (tab: AppTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="relative mx-auto flex min-h-dvh w-full flex-col bg-[var(--background)] text-[var(--foreground)]">
      <header
        className={cn(
          'sticky top-0 z-40 border-b border-white/5 bg-[color-mix(in_srgb,var(--background)_80%,transparent)] backdrop-blur-xl',
          'pt-3'
        )}
      >
        <div className="flex min-h-11 items-center justify-between px-4 pb-3">
          <h1 className="text-[17px] font-semibold tracking-tight">{title}</h1>
          <div className="flex items-center gap-2">
            {!isOnline || pending > 0 ? (
              <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-zinc-300">
                {!isOnline ? 'Offline' : `${pending} na fila`}
              </span>
            ) : null}
            <ThemeToggle />
            <UserIdentity />
          </div>
        </div>
        <div className="px-4 pb-3">
          <SegmentedControl
            options={TABS}
            value={activeTab}
            onChange={handleTabChange}
            ariaLabel="Navegação principal"
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-y-contain pb-6">
        {children}
      </div>
    </div>
  );
}
