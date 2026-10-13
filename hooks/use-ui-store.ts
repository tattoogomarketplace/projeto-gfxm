'use client';

import { create } from 'zustand';

export type AppTab = 'portfolio' | 'agendar' | 'chat' | 'perfil';

/**
 * Ciclo de vida explícito do drawer de configurações.
 *
 * O bug de "aborto em pleno voo" nasce de um booleano único (`open`) que é
 * revertido enquanto a mola de entrada ainda está interpolando. Aqui o estado
 * é uma MÁQUINA com fases discretas e transições sancionadas:
 *
 *   closed ──toggle/open──> entering ──enter complete──> open
 *      ^                         │                            │
 *      │                         └────────close───────┐       │
 *      │                                              v       │
 *      └──────────── exit complete ────────────────  exiting <─┘ toggle/close
 *
 * Regras:
 *  - `entering` e `exiting` são estados BLOQUEADOS: nenhum toggle do gatilho
 *    pode inverter a direção da animação corrente (a trava é síncrona, lida
 *    de `get()`, então vale até para dois cliques no mesmo tick).
 *  - `close` (X, backdrop, Escape, swipe) é SEMPRE honrado a partir de
 *    `entering`/`open` — dispensa integral preservada.
 *  - A fase só avança quando a própria animação confirma a conclusão
 *    (`onAnimationComplete` na entrada, `onExitComplete` na saída).
 */
export type SettingsDrawerPhase = 'closed' | 'entering' | 'open' | 'exiting';

interface UiState {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  pendingChatPeer: string | null;
  setPendingChatPeer: (id: string | null) => void;
  pendingChatArtwork: string | null;
  setPendingChatArtwork: (id: string | null) => void;
  settingsDrawerPhase: SettingsDrawerPhase;
  openSettingsDrawer: () => void;
  closeSettingsDrawer: () => void;
  toggleSettingsDrawer: () => void;
  completeSettingsDrawerEnter: () => void;
  completeSettingsDrawerExit: () => void;
}

export const selectSettingsDrawerOpen = (state: UiState): boolean =>
  state.settingsDrawerPhase === 'entering' || state.settingsDrawerPhase === 'open';

export const useUiStore = create<UiState>((set, get) => ({
  activeTab: 'portfolio',
  setActiveTab: (tab) => set({ activeTab: tab }),
  pendingChatPeer: null,
  setPendingChatPeer: (id) => set({ pendingChatPeer: id }),
  pendingChatArtwork: null,
  setPendingChatArtwork: (id) => set({ pendingChatArtwork: id }),
  settingsDrawerPhase: 'closed',
  openSettingsDrawer: () => {
    if (get().settingsDrawerPhase !== 'closed') return;
    set({ settingsDrawerPhase: 'entering' });
  },
  closeSettingsDrawer: () => {
    const phase = get().settingsDrawerPhase;
    // `closed`/`exiting` são terminais para o fechamento. A partir de
    // `entering` ou `open` o fechamento é sempre acatado.
    if (phase === 'closed' || phase === 'exiting') return;
    set({ settingsDrawerPhase: 'exiting' });
  },
  toggleSettingsDrawer: () => {
    const phase = get().settingsDrawerPhase;
    if (phase === 'closed') {
      set({ settingsDrawerPhase: 'entering' });
      return;
    }
    if (phase === 'open') {
      set({ settingsDrawerPhase: 'exiting' });
      return;
    }
    // `entering` | `exiting`: trava atômica. A direção da animação em curso
    // não pode ser revertida até a conclusão reportada pelo motion.
  },
  completeSettingsDrawerEnter: () => {
    if (get().settingsDrawerPhase !== 'entering') return;
    set({ settingsDrawerPhase: 'open' });
  },
  completeSettingsDrawerExit: () => {
    if (get().settingsDrawerPhase !== 'exiting') return;
    set({ settingsDrawerPhase: 'closed' });
  },
}));

export const useSettingsDrawerOpen = (): boolean =>
  useUiStore(selectSettingsDrawerOpen);
