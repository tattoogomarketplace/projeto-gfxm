import { ViewportScaleGuard } from '@/components/layout/viewport-scale-guard';

export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Contêiner estrutural de rota: sempre a MESMA geometria travada
    // (`relative h-full min-h-0 w-full flex-1`). Vive dentro do viewport
    // `absolute inset-0` do `AppShell`, então cada `page.tsx`/`loading.tsx`
    // herda uma caixa física fixa — entrar, sair ou suspender um segmento nunca
    // altera a altura do pai (sem colapso de Suspense).
    <div
      data-route-container
      className="relative flex h-full min-h-0 min-w-0 w-full flex-1 flex-col"
    >
      <ViewportScaleGuard />
      {children}
    </div>
  );
}
