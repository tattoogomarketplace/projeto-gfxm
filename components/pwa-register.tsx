'use client';

import { useEffect } from 'react';
import { flushOfflineQueue, useOfflineQueue } from '@/hooks/use-offline-queue';

export function PwaRegister() {
  const setOnline = useOfflineQueue((s) => s.setOnline);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    void useOfflineQueue.persist.rehydrate();

    const syncNetwork = () => {
      const online = navigator.onLine;
      setOnline(online);
      if (online) void flushOfflineQueue();
    };

    syncNetwork();
    window.addEventListener('online', syncNetwork);
    window.addEventListener('offline', syncNetwork);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
    }

    return () => {
      window.removeEventListener('online', syncNetwork);
      window.removeEventListener('offline', syncNetwork);
    };
  }, [setOnline]);

  return null;
}
