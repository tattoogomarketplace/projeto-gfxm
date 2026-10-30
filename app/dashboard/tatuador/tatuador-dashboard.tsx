'use client';

import { memo } from 'react';
import { useUser } from '@clerk/nextjs';
import { useKeepAliveTab } from '@/hooks/use-keep-alive-tab';
import { ChatWorkspace } from '@/components/features/chat/chat-workspace';
import { ImmersiveAgenda } from '@/components/features/immersive-agenda';
import { ArtistStudioHub } from '@/components/features/artist-hub/artist-studio-hub';
import { AppReadySignal } from '@/components/layout/app-ready';
import { PersistentTabPane } from '@/components/layout/persistent-tab-pane';
import { ProfileView } from '@/components/features/profile-view';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import type { AppTab } from '@/hooks/use-ui-store';
import type { AppRole } from '@/lib/utils/auth-redirect';

const HomePane = memo(function HomePane({
  tatuadorId,
  artistName,
}: {
  tatuadorId?: string;
  artistName: string;
}) {
  return (
    <section className="nav-safe-pad mx-auto min-h-0 min-w-0 w-full max-w-2xl overflow-x-hidden overflow-y-auto overscroll-none pt-5 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] [-webkit-overflow-scrolling:touch] sm:pl-[max(1.5rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))]">
      <ArtistStudioHub tatuadorId={tatuadorId} artistName={artistName} />
    </section>
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

export default function TatuadorDashboard({
  initialTab = 'portfolio',
}: {
  role?: AppRole;
  initialTab?: AppTab;
}) {
  const { user } = useUser();
  const activeTab = useKeepAliveTab(initialTab);

  return (
    <div className="relative flex min-h-0 min-w-0 w-full flex-1 flex-col bg-transparent text-gray-900 dark:text-white">
      <AppReadySignal />
      <PersistentTabPane active={activeTab === 'portfolio'}>
        <HomePane tatuadorId={user?.id} artistName={user?.fullName ?? ''} />
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
