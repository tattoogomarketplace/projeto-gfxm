'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { BrandLogo } from '@/components/brand/brand-logo';
import {
  hidesAppShellHeader,
  isAuthPath,
  isSelfScrollingPath,
  resolveDestinationSkeleton,
} from '@/components/features/destination-route-skeleton';
import { AuthBootFallback } from '@/components/layout/auth-boot-fallback';
import { AuthFormSkeleton } from '@/components/ui/route-skeletons';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * CASCO DE BOOT — ZERO CLS (Fase 25.6).
 *
 * O `<ClerkLoading>` do Root Layout vive FORA do casco autenticado
 * (`app/dashboard/layout.tsx`), então, enquanto o Clerk valida a sessão
 * recém-criada (hand-off do OTP), ele pintava um conteúdo `AppRouteSkeleton`
 * sem header, sem dock e sem o padding do viewport do `AppShell`. Quando o
 * Clerk resolvia, o casco real aparecia e o esqueleto "esticava"/deslizava:
 * títulos e cards trocavam de coordenadas (CLS > 0) antes do conteúdo real.
 *
 * Esta camada resolve o problema na raiz: ela lê o pathname de forma SÍNCRONA
 * (client-only — o `<ClerkLoading>` só renderiza no ciclo de validação do
 * Clerk) e replica EXATAMENTE a geometria do casco real (o mesmo
 * `data-viewport-root` + a mesma caixa de conteúdo do `AppShell`, com header,
 * `px-4 sm:px-6`, `nav-safe-pad` e dock) preenchendo a área com o MESMO
 * esqueleto que a rota de destino usa em `loading.tsx`. Assim, o handoff
 * ClerkLoading -> rota -> conteúdo é um único frame contínuo: os cards de
 * shimmer ficam travados nas mesmas coordenadas do início ao fim.
 */

function ShellChrome({
  children,
  hideHeader = false,
  selfScrolling = false,
}: {
  children: ReactNode;
  hideHeader?: boolean;
  selfScrolling?: boolean;
}) {
  return (
    <div
      data-viewport-root
      className="luxury-canvas relative flex h-[100dvh] max-h-[100dvh] min-h-[100dvh] min-w-0 w-full flex-col overflow-hidden overscroll-none bg-background text-neutral-900 select-none dark:text-white"
    >
      <div className="luxury-canvas relative flex h-full min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden overscroll-none bg-background text-neutral-900 select-none dark:text-white">
        {hideHeader ? null : (
          <header
            data-app-header
            className="fixed top-0 left-0 z-50 w-full shrink-0 bg-[#121212] backdrop-blur-md pt-[max(env(safe-area-inset-top),_16px)]"
          >
            <div className="relative isolate h-11 min-h-11 max-h-11 w-full shrink-0 contain-layout">
              <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
                <BrandLogo className="h-auto w-auto px-0" size="sm" />
              </div>
              <div className="absolute right-4 top-1/2 z-20 flex -translate-y-1/2 items-center">
                <span aria-hidden className="h-11 w-11 min-h-11 min-w-11 shrink-0" />
              </div>
            </div>
            <div className="hidden px-4 pb-3 md:block">
              <div className="grid w-full rounded-2xl border border-black/[0.04] bg-black/[0.03] p-1 backdrop-blur-xl dark:border-white/5 dark:bg-white/[0.04]">
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
            </div>
          </header>
        )}

        <div className="scrollbar-none relative flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden">
          <div
            data-shell-viewport
            className={cn(
              'absolute inset-0 flex min-h-0 min-w-0 flex-col',
              selfScrolling ? '' : 'nav-safe-pad',
              selfScrolling
                ? 'overflow-hidden'
                : 'overflow-x-hidden overflow-y-auto overscroll-none px-4 [-webkit-overflow-scrolling:touch] sm:px-6'
            )}
          >
            {hideHeader ? null : (
              <div
                aria-hidden
                data-app-header-spacer
                className="pointer-events-none shrink-0 pt-[max(env(safe-area-inset-top),_16px)]"
              >
                <div className="h-11 min-h-11 max-h-11 shrink-0" />
                <div className="hidden px-4 pb-3 md:block">
                  <div className="h-11" />
                </div>
              </div>
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function BootShellSkeleton() {
  const pathname = usePathname();

  if (pathname === '/') {
    return <AuthBootFallback />;
  }

  if (isAuthPath(pathname)) {
    return <AuthFormSkeleton />;
  }

  const hideHeader = hidesAppShellHeader(pathname);
  const selfScrolling = isSelfScrollingPath(pathname);

  return (
    <ShellChrome hideHeader={hideHeader} selfScrolling={selfScrolling}>
      {resolveDestinationSkeleton(pathname)}
    </ShellChrome>
  );
}
