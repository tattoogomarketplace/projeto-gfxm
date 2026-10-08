'use client';

import { memo, startTransition, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { CalendarDays, Home, MessageCircle, UserRound } from 'lucide-react';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useAuthStore } from '@/hooks/use-auth-store';
import { useI18n } from '@/hooks/use-i18n';
import { useUiStore, type AppTab } from '@/hooks/use-ui-store';
import { dashboardPathForRole } from '@/lib/utils/auth-redirect';
import { forceViewportRecalibration, resetViewportScale } from '@/lib/utils/viewport-scale';
import { cn } from '@/lib/utils';
import type { MessageKey } from '@/lib/i18n/types';

const ITEMS: Array<{
  tab: AppTab;
  labelKey: MessageKey;
  icon: typeof Home;
}> = [
  { tab: 'portfolio', labelKey: 'nav.home', icon: Home },
  { tab: 'agendar', labelKey: 'nav.schedule', icon: CalendarDays },
  { tab: 'chat', labelKey: 'nav.chat', icon: MessageCircle },
  { tab: 'perfil', labelKey: 'nav.profile', icon: UserRound },
];

type BottomNavProps = {
  hidden?: boolean;
};

function resolveActiveTab(pathname: string, storeTab: AppTab): AppTab {
  if (pathname.startsWith('/dashboard/perfil')) return 'perfil';
  if (pathname.startsWith('/dashboard/chat')) return 'chat';
  if (pathname.startsWith('/dashboard/pagamentos')) return 'agendar';
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

/**
 * Sub-rotas que renderizam fora do casco padrão ("sem casco"). Ao tocar numa
 * aba global a partir delas, precisamos de um hard clean-up: desfocar campos,
 * remover transforms/escala residuais e reafirmar o viewport 1:1 antes de
 * montar a dock. Caso contrário o iOS mantém o visual viewport ampliado e o
 * container raiz fica distorcido (bug do fluxo "Quero ser Tatuador").
 */
function isShellBypassedRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/dashboard/seja-tatuador') ||
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
  const router = useRouter();
  const role = useAuthStore((s) => s.role);
  const storeTab = useUiStore((s) => s.activeTab);
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const { t } = useI18n();
  const { triggerHaptic } = useHapticFeedback();

  const conceal = hidden || shouldHideNav(pathname);
  const homePath = dashboardPathForRole(role);
  const activeTab = resolveActiveTab(pathname, storeTab);

  // Prefetch em background das abas globais. No mobile não existe "hover", então
  // o Next só pré-carrega o RSC das rotas (`/dashboard/chat`, `/dashboard/perfil`)
  // quando o link entra no viewport — aquecer aqui garante que o payload já
  // esteja em cache antes do toque e a troca de aba seja instantânea (sem tela
  // vazia / layout shift).
  useEffect(() => {
    const warm = [
      '/dashboard/chat',
      '/dashboard/perfil',
      '/dashboard/galeria',
      '/dashboard/pagamentos',
      `${homePath}?tab=portfolio`,
      `${homePath}?tab=agendar`,
    ];
    warm.forEach((href) => router.prefetch(href));
  }, [router, homePath]);

  const handleSelect = useCallback(
    (tab: AppTab, href: string) => {
      triggerHaptic('light');
      // Aquece a rota de destino no mesmo tick do toque. Para as abas que
      // alternam estado na MESMA rota (Início/Agenda via `?tab=`), envolvemos a
      // atualização do store em `startTransition`: o React mantém o frame atual
      // pintado até que o próximo esteja pronto, eliminando o flash de estado
      // vazio durante a recomposição.
      if (href.startsWith('/dashboard/chat') || href.startsWith('/dashboard/perfil')) {
        router.prefetch(href);
      }
      // "Hard clean-up" ao sair de uma sub-rota sem casco: purga foco, zoom e
      // transforms residuais imediatamente e agenda uma segunda passada após o
      // iOS restaurar a escala de forma assíncrona, evitando que o sub-route
      // estados vazem para o container raiz da aba de destino.
      if (isShellBypassedRoute(pathname)) {
        resetViewportScale({ forceBlur: true });
        forceViewportRecalibration();
        window.requestAnimationFrame(() => {
          resetViewportScale({ forceBlur: true });
          forceViewportRecalibration();
        });
      }
      if (tab !== 'perfil') {
        startTransition(() => {
          setActiveTab(tab);
        });
      }
    },
    [pathname, router, setActiveTab, triggerHaptic]
  );

  return (
    <nav
      className={cn(
        'fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4 z-[60] mx-auto max-w-md md:hidden',
        'glass-chrome rounded-2xl border border-black/[0.04] dark:border-white/[0.05]',
        'shadow-2xl',
        'flex transform-gpu items-center px-1 py-1.5',
        conceal && 'pointer-events-none invisible'
      )}
      aria-label={t('nav.home')}
      aria-hidden={conceal}
    >
      <ul className="grid h-11 w-full grid-cols-4">
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
                onClick={() => handleSelect(item.tab, href)}
                className={cn(
                  'group flex min-h-11 w-full min-w-11 transform-gpu flex-col items-center justify-center gap-0.5',
                  'text-[10px] font-medium leading-none tracking-tight',
                  'rounded-xl transition-[transform,color] duration-150 ease-out active:scale-95',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70',
                  active ? 'text-primary' : 'text-zinc-500 dark:text-zinc-400'
                )}
                aria-current={active ? 'page' : undefined}
              >
                <span className="flex transform-gpu items-center justify-center transition-transform duration-150 ease-out group-active:scale-95">
                  <NavIcon icon={item.icon} />
                </span>
                <span>{t(item.labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export const BottomNav = memo(BottomNavInner);
