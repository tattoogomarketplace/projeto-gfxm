'use client';

import { memo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

function resolveActiveTab(pathname: string, storeTab: AppTab): AppTab {
  if (pathname.startsWith('/dashboard/perfil')) return 'perfil';
  if (pathname.startsWith('/dashboard/chat')) return 'chat';
  if (storeTab === 'agendar' || storeTab === 'chat' || storeTab === 'portfolio') {
    return storeTab;
  }
  return 'portfolio';
}

function shouldHideNav(pathname: string): boolean {
  if (!pathname.startsWith('/dashboard')) return true;
  return (
    pathname.startsWith('/dashboard/onboarding') ||
    pathname.startsWith('/dashboard/ai') ||
    pathname.startsWith('/dashboard/kyc-pendente')
  );
}

const NavIcon = memo(function NavIcon({
  icon: Icon,
}: {
  icon: typeof Home;
}) {
  return <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />;
});

function BottomNavInner({ hidden = false }: BottomNavProps) {
  const pathname = usePathname();
  const role = useAuthStore((s) => s.role);
  const storeTab = useUiStore((s) => s.activeTab);
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const { triggerHaptic } = useHapticFeedback();

  const conceal = hidden || !role || shouldHideNav(pathname);
  const homePath = role ? dashboardPathForRole(role) : '/dashboard';
  const activeTab = resolveActiveTab(pathname, storeTab);

  const handleSelect = useCallback(
    (tab: AppTab) => {
      triggerHaptic('light');
      if (tab !== 'perfil') setActiveTab(tab);
    },
    [setActiveTab, triggerHaptic]
  );

  return (
    <nav
      className={cn(
        'bottom-nav-safe fixed inset-x-0 bottom-0 z-50 m-0 w-full md:hidden',
        'border-t border-neutral-200/80 bg-[#FFFDF9]',
        'dark:border-white/10 dark:bg-[#121212]',
        'pb-2',
        'pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]',
        conceal && 'pointer-events-none invisible'
      )}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        margin: 0,
        transform: 'none',
        paddingBottom: '0.5rem',
      }}
      aria-label="Navegação principal"
      aria-hidden={conceal}
    >
      <ul className="mx-auto grid h-12 max-w-app grid-cols-4 px-1">
        {ITEMS.map((item) => {
          const active = activeTab === item.tab;
          const href =
            item.tab === 'perfil'
              ? '/dashboard/perfil'
              : item.tab === 'chat'
                ? '/dashboard/chat'
                : `${homePath}?tab=${item.tab}`;
          return (
            <li key={item.tab} className="flex">
              <Link
                href={href}
                prefetch
                scroll={false}
                onClick={() => handleSelect(item.tab)}
                className={cn(
                  'flex min-h-11 w-full min-w-11 flex-col items-center justify-center gap-1',
                  'text-[10px] font-medium leading-none tracking-tight',
                  'transition-colors duration-200 active:scale-[0.98]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
                aria-current={active ? 'page' : undefined}
              >
                <NavIcon icon={item.icon} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export const BottomNav = memo(BottomNavInner);
