import { AppShellBoundary } from '@/components/layout/app-shell-boundary';

// O guard do painel lê o perfil autenticado (Clerk + Prisma). Renderizar o
// segmento de forma dinâmica e sem revalidação impede que uma árvore em cache
// sirva um estado defasado e devolva o usuário para o onboarding logo após
// ele entrar no painel.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[var(--background)]">
      <AppShellBoundary title="TattooGo MK">{children}</AppShellBoundary>
    </div>
  );
}
