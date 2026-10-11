import { AppShellBoundary } from '@/components/layout/app-shell-boundary';
import { BRAND_NAME } from '@/lib/i18n/brands';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Shell do painel.
 *
 * A estrutura raiz é intencionalmente determinística: TODAS as rotas sob
 * `/dashboard` são embrulhadas pelo mesmo `data-viewport-root` + `AppShell`.
 *
 * Antes, este layout decidia a presença do shell lendo o header `x-pathname`
 * via `headers()` e retornando um fragmento puro para as rotas "sem casco"
 * (`onboarding`, `kyc-pendente`, `seja-tatuador`). Como um layout do App Router
 * é preservado entre navegações de cliente do mesmo segmento, essa decisão era
 * avaliada uma única vez e congelada pelo resto da sessão. Assim, ao entrar numa
 * sub-rota "sem casco" e depois tocar na barra inferior (Início, Agenda, Chat),
 * o destino era montado SEM shell/`data-viewport-root`, corrompendo o container
 * raiz e deixando a escala de viewport residual do iOS presa.
 *
 * A decisão de exibir ou não o chrome agora é 100% do cliente (`AppShell`), que
 * lê `usePathname()` e re-renderiza em cada transição — nunca sai de sincronia
 * com a rota atual. Este arquivo não deve voltar a ramificar estrutura por
 * pathname/headers.
 */
function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    // PONTO ÚNICO DE VERDADE DA GEOMETRIA GLOBAL.
    //
    // Toda a matemática do viewport vive AQUI, no nível mais alto possível:
    //  - `h-[100dvh]` / `min-h-[100dvh]`: altura dinâmica segura para a barra
    //    de endereço móvel (nunca `100vh`, que quebra em iOS/Android).
    //  - `w-full` + `overflow-hidden`: largura lockada; nenhuma barra de
    //    rolagem do conteúdo pode alterar o bounding box do shell.
    //  - `overscroll-none`: elimina o bounce/rubber-band do documento.
    //
    // O `AppShellBoundary` (client, renderizado aqui dentro) herda este pai
    // `h-full` e aplica, de forma condicional, o clearance da dock inferior
    // (`nav-safe-pad` → `env(safe-area-inset-bottom)` + altura da dock) e o
    // respectivo padding de safe-area. Rotas "sem casco" (onboarding, KYC,
    // Atelier IA) não reservam dock — por isso o clearance não pode ser
    // incondicional aqui; ele pertence à fronteira do casco, que decide isso
    // por rota sem sair de sincronia.
    <div
      data-viewport-root
      className="luxury-canvas relative flex h-[100dvh] max-h-[100dvh] min-h-[100dvh] min-w-0 w-full flex-col overflow-hidden overscroll-none bg-background text-neutral-900 select-none dark:text-white"
    >
      <AppShellBoundary title={BRAND_NAME}>{children}</AppShellBoundary>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
