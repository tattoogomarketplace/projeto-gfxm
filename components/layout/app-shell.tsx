'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Settings } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SettingsSheet } from '@/components/features/settings-sheet';
import { useUiStore, type AppTab } from '@/hooks/use-ui-store';
import { useOfflineQueue } from '@/hooks/use-offline-queue';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
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
  const settingsOpen = useUiStore((s) => s.settingsOpen);
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);
  const isOnline = useOfflineQueue((s) => s.isOnline);
  const pending = useOfflineQueue((s) => s.queue.length);
  const { triggerHaptic } = useHapticFeedback();
  const refresh = usePullToRefresh(async () => {
    router.refresh();
  });

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
    <div className="relative mx-auto flex min-h-dvh w-full flex-col bg-[#121212] text-white">
      <header
        className={cn(
          'sticky top-0 z-40 border-b border-white/5 bg-[#121212]/80 backdrop-blur-xl',
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
            <button
              type="button"
              aria-label="Ajustes"
              onClick={() => {
                triggerHaptic('light');
                setSettingsOpen(true);
              }}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white/8 text-zinc-200 active:scale-95"
            >
              <Settings size={18} />
            </button>
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

      <div
        className="relative flex-1 overflow-y-auto overscroll-y-contain pb-6"
        onTouchStart={refresh.onTouchStart}
        onTouchMove={refresh.onTouchMove}
        onTouchEnd={refresh.onTouchEnd}
      >
        <div
          className="pointer-events-none flex items-center justify-center text-[11px] font-medium text-zinc-400 transition-[height] duration-150"
          style={{ height: refresh.offset }}
        >
          {refresh.refreshing ? 'Atualizando…' : refresh.offset > 48 ? 'Solte para atualizar' : ''}
        </div>
        {children}
      </div>

      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
