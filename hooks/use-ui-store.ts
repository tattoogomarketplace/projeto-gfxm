'use client';

import { create } from 'zustand';

export type AppTab = 'portfolio' | 'agendar' | 'chat' | 'perfil';

export interface AnimationLock {
  current: boolean;
}

interface UiState {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  pendingChatPeer: string | null;
  setPendingChatPeer: (id: string | null) => void;
  pendingChatArtwork: string | null;
  setPendingChatArtwork: (id: string | null) => void;
  settingsDrawerOpen: boolean;
  settingsDrawerAnimatingRef: AnimationLock;
  openSettingsDrawer: () => void;
  closeSettingsDrawer: () => void;
  toggleSettingsDrawer: () => void;
  releaseSettingsDrawer: () => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  activeTab: 'portfolio',
  setActiveTab: (tab) => set({ activeTab: tab }),
  pendingChatPeer: null,
  setPendingChatPeer: (id) => set({ pendingChatPeer: id }),
  pendingChatArtwork: null,
  setPendingChatArtwork: (id) => set({ pendingChatArtwork: id }),
  settingsDrawerOpen: false,
  settingsDrawerAnimatingRef: { current: false },
  openSettingsDrawer: () => {
    const animating = get().settingsDrawerAnimatingRef;
    if (animating.current) return;
    animating.current = true;
    set({ settingsDrawerOpen: true });
  },
  closeSettingsDrawer: () => {
    const state = get();
    const animating = state.settingsDrawerAnimatingRef;
    // O "X"/backdrop/Escape sempre fecham: ignoram a trava de entrada e só
    // travam o ciclo de SAÍDA, liberado no `onAnimationComplete` do drawer.
    animating.current = false;
    if (!state.settingsDrawerOpen) return;
    animating.current = true;
    set({ settingsDrawerOpen: false });
  },
  toggleSettingsDrawer: () => {
    const state = get();
    const animating = state.settingsDrawerAnimatingRef;
    if (animating.current) return;
    animating.current = true;
    set({ settingsDrawerOpen: !state.settingsDrawerOpen });
  },
  releaseSettingsDrawer: () => {
    get().settingsDrawerAnimatingRef.current = false;
  },
}));
