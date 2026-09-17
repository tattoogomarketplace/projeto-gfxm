'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type OfflineActionType = 'like' | 'message' | 'schedule';
export type OfflineActionStatus = 'pending' | 'syncing' | 'failed';

export interface OfflineAction {
  id: string;
  type: OfflineActionType;
  payload: Record<string, unknown>;
  createdAt: number;
  status: OfflineActionStatus;
  retries: number;
}

interface OfflineQueueState {
  isOnline: boolean;
  queue: OfflineAction[];
  setOnline: (online: boolean) => void;
  enqueue: (type: OfflineActionType, payload: Record<string, unknown>) => string;
  markSyncing: (id: string) => void;
  markFailed: (id: string) => void;
  dequeue: (id: string) => void;
  pendingCount: () => number;
}

const MAX_RETRIES = 3;

export const useOfflineQueue = create<OfflineQueueState>()(
  persist(
    (set, get) => ({
      isOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
      queue: [],
      setOnline: (online) => set({ isOnline: online }),
      enqueue: (type, payload) => {
        const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        set((state) => ({
          queue: [
            ...state.queue,
            {
              id,
              type,
              payload,
              createdAt: Date.now(),
              status: 'pending',
              retries: 0,
            },
          ],
        }));
        return id;
      },
      markSyncing: (id) =>
        set((state) => ({
          queue: state.queue.map((item) =>
            item.id === id ? { ...item, status: 'syncing' } : item
          ),
        })),
      markFailed: (id) =>
        set((state) => ({
          queue: state.queue
            .map((item) =>
              item.id === id
                ? { ...item, status: 'failed' as const, retries: item.retries + 1 }
                : item
            )
            .filter((item) => item.retries < MAX_RETRIES),
        })),
      dequeue: (id) =>
        set((state) => ({
          queue: state.queue.filter((item) => item.id !== id),
        })),
      pendingCount: () => get().queue.filter((item) => item.status !== 'syncing').length,
    }),
    {
      name: 'tattoogo-offline-queue',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ queue: state.queue }),
      skipHydration: true,
    }
  )
);

export async function flushOfflineQueue() {
  const { queue, isOnline, markSyncing, dequeue, markFailed } = useOfflineQueue.getState();
  if (!isOnline) return;

  for (const action of queue) {
    if (action.status === 'syncing') continue;
    markSyncing(action.id);
    try {
      const ok = await dispatchOfflineAction(action);
      if (ok) dequeue(action.id);
      else markFailed(action.id);
    } catch {
      markFailed(action.id);
    }
  }
}

async function dispatchOfflineAction(action: OfflineAction): Promise<boolean> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('tattoogo_token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  if (action.type === 'like') {
    const id = String(action.payload.id ?? '');
    const res = await fetch(`/api/portfolio/like/${id}`, { method: 'POST', headers });
    return res.ok;
  }

  if (action.type === 'message') {
    const res = await fetch('/api/chat/enviar', {
      method: 'POST',
      headers,
      body: JSON.stringify(action.payload),
    });
    return res.ok;
  }

  if (action.type === 'schedule') {
    const res = await fetch('/api/agendamentos', {
      method: 'POST',
      headers,
      body: JSON.stringify(action.payload),
    });
    return res.ok;
  }

  return false;
}
