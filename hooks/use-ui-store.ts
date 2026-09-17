'use client';

import { create } from 'zustand';

export type AppTab = 'portfolio' | 'agendar' | 'chat';

interface UiState {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeTab: 'portfolio',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
