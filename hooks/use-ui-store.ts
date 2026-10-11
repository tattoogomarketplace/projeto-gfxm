'use client';

import { create } from 'zustand';

export type AppTab = 'portfolio' | 'agendar' | 'chat' | 'perfil';

interface UiState {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  pendingChatPeer: string | null;
  setPendingChatPeer: (id: string | null) => void;
  pendingChatArtwork: string | null;
  setPendingChatArtwork: (id: string | null) => void;
  // Immersive-state beacon shared with the App Shell / BottomNav. It is true
  // ONLY while an actual conversation thread is open on the dedicated chat
  // route (`/dashboard/chat?artistId=...`), never for the inbox/hub. Keeping it
  // in the store lets the shell react to the *same* synchronous commit as the
  // workspace, so the inbox keeps the bottom navigation and the container size
  // is decided before the first paint — no post-hydration snapping.
  chatThreadActive: boolean;
  setChatThreadActive: (active: boolean) => void;
  settingsDrawerOpen: boolean;
  openSettingsDrawer: () => void;
  closeSettingsDrawer: () => void;
  toggleSettingsDrawer: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeTab: 'portfolio',
  setActiveTab: (tab) => set({ activeTab: tab }),
  pendingChatPeer: null,
  setPendingChatPeer: (id) => set({ pendingChatPeer: id }),
  pendingChatArtwork: null,
  setPendingChatArtwork: (id) => set({ pendingChatArtwork: id }),
  chatThreadActive: false,
  setChatThreadActive: (active) => set({ chatThreadActive: active }),
  settingsDrawerOpen: false,
  openSettingsDrawer: () => set({ settingsDrawerOpen: true }),
  closeSettingsDrawer: () => set({ settingsDrawerOpen: false }),
  toggleSettingsDrawer: () => set((s) => ({ settingsDrawerOpen: !s.settingsDrawerOpen })),
}));
