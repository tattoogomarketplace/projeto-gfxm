'use client';

import { memo } from 'react';
import { usePathname } from 'next/navigation';
import { AiAssistantFab } from '@/components/layout/ai-assistant-fab';
import { TattooMachineMenuTrigger } from '@/components/ui/tattoo-machine-menu-icon';
import { useSettingsDrawerOpen, useUiStore } from '@/hooks/use-ui-store';
import { cn } from '@/lib/utils';

/**
 * CHROME PERSISTENTE DO CASCO (Fase 25.7 — zero flicker de hidratação).
 *
 * O gatilho de configurações e o FAB do Atelier IA viviam dentro do `AppShell`,
 * que por sua vez vive dentro de `<ClerkLoaded>`. No handoff de boot
 * (`BootShellSkeleton` em `<ClerkLoading>` -> `AppShell` em `<ClerkLoaded>`)
 * esses dois ícones eram desmontados/remontados junto com a árvore do casco,
 * produzindo um frame de desaparecimento no exato momento em que o conteúdo
 * real assumia.
 *
 * Esta camada é montada UMA ÚNICA VEZ no root layout, fora de qualquer
 * fronteira de Suspense, `loading.tsx` ou condicional do Clerk. Os ícones nunca
 * desmontam entre rotas/hidratação: apenas ficam `invisible` nas rotas que já
 * não exibiam o chrome (onboarding, IA, KYC, "Quero ser Tatuador" e chat).
 * A geometria é idêntica à do header (`top` = safe-area + 0.75rem, `right` =
 * 1rem, alvo de toque 44x44), então o slot reservado no header não desloca.
 */

const CHROME_HIDDEN_PREFIXES = [
  '/dashboard/onboarding',
  '/dashboard/ai',
  '/dashboard/kyc-pendente',
  '/dashboard/seja-tatuador',
  '/dashboard/chat',
] as const;

export function isPersistentChromeVisible(pathname: string): boolean {
  if (!pathname.startsWith('/dashboard')) return false;
  return !CHROME_HIDDEN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function PersistentAppChromeBase() {
  const pathname = usePathname();
  const visible = isPersistentChromeVisible(pathname);
  const settingsDrawerOpen = useSettingsDrawerOpen();
  const toggleSettingsDrawer = useUiStore((s) => s.toggleSettingsDrawer);

  return (
    <>
      <div
        aria-hidden={!visible}
        className={cn(
          'fixed right-4 top-[max(0.75rem,env(safe-area-inset-top))] z-[65]',
          !visible && 'invisible pointer-events-none'
        )}
      >
        <TattooMachineMenuTrigger
          open={settingsDrawerOpen}
          onClick={toggleSettingsDrawer}
        />
      </div>
      <AiAssistantFab visible={visible} />
    </>
  );
}

export const PersistentAppChrome = memo(PersistentAppChromeBase);
