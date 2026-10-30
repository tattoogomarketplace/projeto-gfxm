'use client';

import { useEffect, useSyncExternalStore } from 'react';

let appReady = false;
const listeners = new Set<() => void>();

function notifyAppReady() {
  for (const listener of listeners) listener();
}

function subscribeAppReady(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getAppReadySnapshot() {
  return appReady;
}

function getAppReadyServerSnapshot() {
  return false;
}

export function markAppReady() {
  if (appReady) return;
  appReady = true;
  notifyAppReady();
}

export function useAppReady() {
  return useSyncExternalStore(
    subscribeAppReady,
    getAppReadySnapshot,
    getAppReadyServerSnapshot
  );
}

export function useMarkAppReadyOnPaint(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    let frame2 = 0;
    const frame1 = window.requestAnimationFrame(() => {
      frame2 = window.requestAnimationFrame(() => {
        markAppReady();
      });
    });

    return () => {
      window.cancelAnimationFrame(frame1);
      window.cancelAnimationFrame(frame2);
    };
  }, [enabled]);
}

export function AppReadySignal() {
  useMarkAppReadyOnPaint(true);
  return null;
}
