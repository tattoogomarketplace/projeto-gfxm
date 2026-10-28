'use client';

import { memo } from 'react';
import { ChatWorkspace } from '@/components/features/chat/chat-workspace';
import { HomeDiscover } from '@/components/features/home-discover';
import { ImmersiveAgenda } from '@/components/features/immersive-agenda';
import { PersistentTabPane } from '@/components/layout/persistent-tab-pane';
import { ProfileView } from '@/components/features/profile-view';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useKeepAliveTab } from '@/hooks/use-keep-alive-tab';
import type { AppTab } from '@/hooks/use-ui-store';
import type { InspirationItem } from '@/lib/gallery-mock';
import type { FlashNoteDto } from '@/lib/types/chat';
import type { AppRole } from '@/lib/utils/auth-redirect';

const HomePane = memo(function HomePane({
  feedItems,
  savedItems,
  flashNotes,
}: {
  feedItems: InspirationItem[];
  savedItems: InspirationItem[];
  flashNotes: FlashNoteDto[];
}) {
  return (
    <section className="nav-safe-pad min-h-0 min-w-0 w-full flex-1 overflow-x-hidden overflow-y-auto overscroll-none pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] [-webkit-overflow-scrolling:touch] sm:pl-[max(1.5rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))]">
      <HomeDiscover feedItems={feedItems} savedItems={savedItems} flashNotes={flashNotes} />
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

export default function ClienteDashboard({
  initialTab = 'portfolio',
  feedItems = [],
  savedItems = [],
  flashNotes = [],
}: {
  role?: AppRole;
  initialTab?: AppTab;
  feedItems?: InspirationItem[];
  savedItems?: InspirationItem[];
  flashNotes?: FlashNoteDto[];
}) {
  const activeTab = useKeepAliveTab(initialTab);

  return (
    <div className="relative flex min-h-0 min-w-0 w-full flex-1 flex-col bg-transparent text-gray-900 dark:text-white">
      <PersistentTabPane active={activeTab === 'portfolio'}>
        <HomePane feedItems={feedItems} savedItems={savedItems} flashNotes={flashNotes} />
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
