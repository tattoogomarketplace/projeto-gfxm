'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type AppTab = 'portfolio' | 'agendar' | 'chat';

interface UiState {
  activeTab: AppTab;
  settingsOpen: boolean;
  hapticsEnabled: boolean;
  setActiveTab: (tab: AppTab) => void;
  setSettingsOpen: (open: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      activeTab: 'portfolio',
      settingsOpen: false,
      hapticsEnabled: true,
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSettingsOpen: (open) => set({ settingsOpen: open }),
      setHapticsEnabled: (enabled) => set({ hapticsEnabled: enabled }),
    }),
    {
      name: 'tattoogo-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        hapticsEnabled: state.hapticsEnabled,
      }),
    }
  )
);
