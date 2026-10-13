import { BootContinuation } from '@/components/layout/boot-continuation';

/**
 * Root route-level loading boundary.
 *
 * Consolidado com a camada `<ClerkLoading>`: em vez de um skeleton distinto que
 * aparecia como um degrau visual entre o splash e o app, pinta exatamente a
 * MESMA continuacao de boot (Deep Graphite + bloom de cobre). Assim o fluxo
 * nativo -> servidor -> hidratacao do Clerk -> UI autenticada e um unico canvas
 * continuo, sem multiplos flashes. Este fallback so aparece quando o segmento
 * raiz suspende; as rotas internas mantem seus skeletons de geometria.
 */
export default function Loading() {
  return <BootContinuation />;
}
