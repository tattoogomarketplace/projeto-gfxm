'use client';

import { Suspense } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';

/**
 * Fallback do Suspense que envolve o `AppShell`.
 *
 * `AppShell` consome `useSearchParams()`, que suspende durante a resolução da
 * navegação. Antes o fallback era um `div` preto vazio, exibindo uma tela
 * completamente preta enquanto o shell hidratava. Agora renderizamos o loader
 * de marca, garantindo feedback visual contínuo (nunca tela preta muda).
 */
function AppShellFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#121212] px-6">
      <TattooMachineLoader label="Preparando seu espaço" />
    </div>
  );
}

export function AppShellBoundary({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <Suspense fallback={<AppShellFallback />}>
      <AppShell title={title}>{children}</AppShell>
    </Suspense>
  );
}
