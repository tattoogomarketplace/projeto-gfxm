'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { CalendarDays, Home, MessageCircle, UserRound } from 'lucide-react';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useAuthStore } from '@/hooks/use-auth-store';
import { useUiStore, type AppTab } from '@/hooks/use-ui-store';
import { dashboardPathForRole } from '@/lib/utils/auth-redirect';
import { cn } from '@/lib/utils';

const ITEMS: Array<{
  tab: AppTab;
  label: string;
  icon: typeof Home;
}> = [
  { tab: 'portfolio', label: 'Início', icon: Home },
  { tab: 'agendar', label: 'Agenda', icon: CalendarDays },
  { tab: 'chat', label: 'Chat', icon: MessageCircle },
  { tab: 'perfil', label: 'Perfil', icon: UserRound },
];

type BottomNavProps = {
  hidden?: boolean;
};

function resolveActiveTab(pathname: string, tabParam: string | null): AppTab {
  if (pathname.startsWith('/dashboard/perfil')) return 'perfil';
  if (tabParam === 'agendar' || tabParam === 'chat' || tabParam === 'portfolio') {
    return tabParam;
  }
  return 'portfolio';
}

export function BottomNav({ hidden = false }: BottomNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const role = useAuthStore((s) => s.role);
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const { triggerHaptic } = useHapticFeedback();

  if (hidden || !role) return null;

  const homePath = dashboardPathForRole(role);
  const activeTab = resolveActiveTab(pathname, searchParams.get('tab'));

  const hrefFor = (tab: AppTab) => {
    if (tab === 'perfil') return '/dashboard/perfil';
    return `${homePath}?tab=${tab}`;
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 w-full border-t border-neutral-200 bg-neutral-50/90 backdrop-blur-md dark:border-neutral-800 dark:bg-black/90 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Navegação principal"
    >
      <ul className="grid h-16 grid-cols-4 px-1">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.tab;
          return (
            <li key={item.tab} className="flex">
              <Link
                href={hrefFor(item.tab)}
                scroll={false}
                onClick={() => {
                  triggerHaptic('light');
                  if (item.tab !== 'perfil') setActiveTab(item.tab);
                }}
                className={cn(
                  'flex min-h-11 w-full min-w-11 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold tracking-tight',
                  'transition-colors duration-200 active:scale-[0.98]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
