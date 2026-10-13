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
  settingsDrawerOpen: false,
  openSettingsDrawer: () => set({ settingsDrawerOpen: true }),
  closeSettingsDrawer: () => set({ settingsDrawerOpen: false }),
  toggleSettingsDrawer: () => set((s) => ({ settingsDrawerOpen: !s.settingsDrawerOpen })),
}));
