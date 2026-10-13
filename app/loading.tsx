import { BootContinuation } from '@/components/layout/boot-continuation';

/**
 * Root route-level loading boundary (Fase 25.2).
 *
 * Renderiza o MESMO canvas único de boot consumido por `<ClerkLoading>`, pelos
 * `loading.tsx` de rota, `DashboardHomeSkeleton` e `SessionHydrating`. Assim o
 * fluxo nativo -> servidor -> hidratação do Clerk -> UI autenticada é um único
 * canvas contínuo (Deep Graphite + bloom de cobre), sem skeletons paralelos e
 * sem layout thrashing.
 */
export default function Loading() {
  return <BootContinuation />;
}
