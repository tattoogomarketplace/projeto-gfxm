'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { BrandLogo } from '@/components/brand/brand-logo';
import { DashboardHomeSkeleton } from '@/components/features/dashboard-home-skeleton';
import {
  AppRouteSkeleton,
  ArtistHubSkeleton,
  StudioDashboardSkeleton,
} from '@/components/ui/route-skeletons';
import { Skeleton } from '@/components/ui/skeleton';

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
 *
 * Rotas fora da Home autenticada (onboarding, IA, KYC, "Quero ser Tatuador",
 * chat, galeria, configurações) mantêm o fallback genérico (`AppRouteSkeleton`)
 * — nunca um `null`/canvas vazio.
 */

const CLIENTE_HOME = '/dashboard/cliente';
const TATUADOR_HOME = '/dashboard/tatuador';
const ESTUDIO_HOME = '/dashboard/estudio';

type HomeKind = 'cliente' | 'tatuador' | 'estudio';

function isAtPath(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

/**
 * Resolve qual Home autenticada o pathname atual pinta. O despachante
 * (`/dashboard`) NÃO pertence a nenhum papel — ele resolve Clerk + Prisma e
 * redireciona. Mapeá-lo para o Feed de Descoberta pintava a Home do cliente
 * para tatuadores/estúdios até o redirect; nesse caso usamos o skeleton
 * genérico do casco (`AppRouteSkeleton`).
 */
function resolveHomeKind(pathname: string): HomeKind | null {
  if (isAtPath(pathname, CLIENTE_HOME)) return 'cliente';
  if (isAtPath(pathname, TATUADOR_HOME)) return 'tatuador';
  if (isAtPath(pathname, ESTUDIO_HOME)) return 'estudio';
  return null;
}

function HomeSkeleton({ kind }: { kind: HomeKind }) {
  if (kind === 'tatuador') return <ArtistHubSkeleton />;
  if (kind === 'estudio') return <StudioDashboardSkeleton />;
  return <DashboardHomeSkeleton />;
}

/**
 * Estrutura imutável do casco (header + viewport de conteúdo). Espelha, classe
 * por classe, o `data-viewport-root` de `app/dashboard/layout.tsx` + o casco de
 * `AppShell` — a caixa física é a MESMA, então nenhuma fronteira (header,
 * padding, dock) pode deslocar os esqueletos na transição.
 */
function ShellChrome({
  children,
  hideHeader = false,
}: {
  children: ReactNode;
  hideHeader?: boolean;
}) {
  return (
    <div
      data-viewport-root
      className="luxury-canvas relative flex h-[100dvh] max-h-[100dvh] min-h-[100dvh] min-w-0 w-full flex-col overflow-hidden overscroll-none bg-background text-neutral-900 select-none dark:text-white"
    >
      <div className="luxury-canvas relative flex h-full min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden overscroll-none bg-background text-neutral-900 select-none dark:text-white">
        {hideHeader ? null : (
          <header className="glass-chrome safe-header-pad z-50 shrink-0 border-b border-black/[0.04] bg-[#121212] dark:border-white/[0.05]">
            <div className="relative flex h-[var(--app-header-content)] w-full items-center px-4">
              <div className="absolute left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]">
                <BrandLogo className="h-11 w-auto px-0" size="sm" />
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-2">
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
          <div className="nav-safe-pad absolute inset-0 flex min-h-0 min-w-0 flex-col overflow-x-hidden overflow-y-auto overscroll-none px-4 sm:px-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function BootShellSkeleton() {
  const pathname = usePathname();
  const kind = resolveHomeKind(pathname);

  // O despachante `/dashboard` pertence ao casco autenticado, mas ainda não
  // conhece o papel. Pintamos o skeleton genérico DENTRO do mesmo chrome
  // (header + dock) para que a troca para a Home do papel não desloque a
  // geometria. Demais rotas sem Home (onboarding, KYC, chat, configurações)
  // seguem com o fallback sem chrome, pois são telas de tela cheia.
  if (!kind) {
    if (pathname === '/dashboard') {
      return (
        <ShellChrome>
          <AppRouteSkeleton />
        </ShellChrome>
      );
    }
    return (
      <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-[#121212]">
        <header className="safe-header-pad z-50 shrink-0 border-b border-white/[0.05] bg-[#121212]">
          <div className="relative flex h-[var(--app-header-content)] w-full items-center px-4">
            <div className="absolute left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]">
              <BrandLogo className="h-11 w-auto px-0" size="sm" />
            </div>
          </div>
        </header>
        <AppRouteSkeleton />
      </div>
    );
  }

  return (
    <ShellChrome>
      <HomeSkeleton kind={kind} />
    </ShellChrome>
  );
}
