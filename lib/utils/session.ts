import { useAuthStore } from '@/hooks/use-auth-store';
import { useOfflineQueue } from '@/hooks/use-offline-queue';

const APP_STORAGE_PREFIX = 'tattoogo';

/**
 * Wipe every client-side marker tied to the current session so the next login
 * is treated as a fresh entry: no cached token, no queued offline actions and
 * no residual device state that could skip full re-authentication (OTP).
 *
 * Intentionally preserves `termsAccepted`, which is a legal acceptance record
 * rather than session/device state.
 */
export function clearClientSession(): void {
  if (typeof window !== 'undefined') {
    try {
      Object.keys(window.localStorage)
        .filter((key) => key.startsWith(APP_STORAGE_PREFIX))
        .forEach((key) => window.localStorage.removeItem(key));
      window.sessionStorage.clear();
    } catch {
      // Storage can be unavailable (private mode); logout must still proceed.
    }
  }

  useAuthStore.getState().clearAuth();
  useOfflineQueue.setState({ queue: [] });
}
