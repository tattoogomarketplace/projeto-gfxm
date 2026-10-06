import { SessionHydrating } from '@/components/features/session-hydrating';
import { requireDashboardPerfil } from '@/lib/utils/dashboard-gate';
import { rethrowNextControlFlow } from '@/lib/utils/next-control-flow';

function AiWallpaperShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-neutral-50 dark:bg-[#09090b]">
      <div
        aria-hidden
        className="tattoo-wallpaper pointer-events-none absolute inset-0 z-0 h-full min-h-[100dvh] w-full"
      />
      <div className="relative z-10 flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export default async function DashboardAiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let perfil = null;
  try {
    perfil = await requireDashboardPerfil();
  } catch (error) {
    rethrowNextControlFlow(error);
    console.error('[dashboard/ai/layout] sessão indisponível', error);
    return (
      <AiWallpaperShell>
        <SessionHydrating />
      </AiWallpaperShell>
    );
  }
  if (!perfil) {
    return (
      <AiWallpaperShell>
        <SessionHydrating />
      </AiWallpaperShell>
    );
  }
  return <AiWallpaperShell>{children}</AiWallpaperShell>;
}
