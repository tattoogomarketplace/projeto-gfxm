'use client';

import { memo } from 'react';
import { useAgendamentos } from '@/hooks/use-agendamentos';
import { GlassContainer } from '@/components/ui/glass-container';
import { Skeleton } from '@/components/ui/skeleton';
import { StudioIncomingRequests } from '@/components/features/studio-incoming-requests';
import { ImmersiveAgenda } from '@/components/features/immersive-agenda';
import { ChatWorkspace } from '@/components/features/chat/chat-workspace';
import { AppReadySignal } from '@/components/layout/app-ready';
import { PersistentTabPane } from '@/components/layout/persistent-tab-pane';
import { ProfileView } from '@/components/features/profile-view';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { getRoleExperience } from '@/lib/content/role-experience';
import { useI18n } from '@/hooks/use-i18n';
import { useKeepAliveTab } from '@/hooks/use-keep-alive-tab';
import type { AppTab } from '@/hooks/use-ui-store';
import type { Agendamento } from '@/lib/types/database';
import type { AppRole } from '@/lib/utils/auth-redirect';

const EXPERIENCE = getRoleExperience('estudio').dashboard;

const HomePane = memo(function HomePane() {
  const { data: agendamentos, isLoading } = useAgendamentos();
  const { t } = useI18n();

  return (
    <div className="nav-safe-pad mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-none pt-5 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] [-webkit-overflow-scrolling:touch] sm:pl-[max(1.5rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))]">
      <h1 className="text-2xl font-bold mb-1">{t(EXPERIENCE.heading)}</h1>
      <p className="mb-6 text-sm text-neutral-600 dark:text-zinc-400">{t(EXPERIENCE.subtitle)}</p>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : (
        <div className="grid gap-4">
          <GlassContainer className="p-6">
            <h2 className="text-xl font-bold mb-2">{t('dashboard.totalAppointments')}</h2>
            <p className="text-4xl text-neon-orange font-bold">
              {agendamentos?.length || 0}
            </p>
          </GlassContainer>

          <div className="mt-6">
            <h3 className="font-bold mb-4">{t('dashboard.artistsOverview')}</h3>
            {agendamentos?.map((ag: Agendamento, index: number) => (
              <div key={ag?.id ?? `agendamento-${index}`} className="border-b border-black/[0.04] py-2 text-sm dark:border-white/[0.05]">
                {t('dashboard.artistStatus', {
                  id: `${(ag?.tatuador_id ?? '').slice(0, 8) || '—'}...`,
                  status: ag?.status ?? 'pendente',
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <StudioIncomingRequests />
      </div>
    </div>
  );
});

const AgendaPane = memo(function AgendaPane() {
  return <ImmersiveAgenda />;
});

const ChatPane = memo(function ChatPane() {
  return <ChatWorkspace />;
});

const ProfilePane = memo(function ProfilePane() {
  return (
    <ErrorBoundary>
      <ProfileView />
    </ErrorBoundary>
  );
});

export default function EstudioDashboard({
  initialTab = 'portfolio',
}: {
  role?: AppRole;
  initialTab?: AppTab;
}) {
  const activeTab = useKeepAliveTab(initialTab);

  return (
    <div className="relative flex min-h-0 min-w-0 w-full flex-1 flex-col bg-transparent text-gray-900 dark:text-white">
      <AppReadySignal />
      <PersistentTabPane active={activeTab === 'portfolio'}>
        <HomePane />
      </PersistentTabPane>
      <PersistentTabPane active={activeTab === 'agendar'}>
        <AgendaPane />
      </PersistentTabPane>
      <PersistentTabPane active={activeTab === 'chat'}>
        <ChatPane />
      </PersistentTabPane>
      <PersistentTabPane active={activeTab === 'perfil'}>
        <ProfilePane />
      </PersistentTabPane>
    </div>
  );
}
