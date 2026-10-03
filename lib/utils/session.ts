import { useAuthStore } from '@/hooks/use-auth-store';
import { useOfflineQueue } from '@/hooks/use-offline-queue';

const APP_STORAGE_PREFIX = 'tattoogo';

/**
 * Marks the current sign-out as user-initiated. The global StrictSessionGuard
 * reads this flag to distinguish a deliberate logout from a remote revocation
 * (single-device kick) and only shows the blocking modal for the latter.
 */
let intentionalSignOut = false;

export function markIntentionalSignOut(): void {
  intentionalSignOut = true;
}

export function isIntentionalSignOut(): boolean {
  return intentionalSignOut;
}

export function resetIntentionalSignOut(): void {
  intentionalSignOut = false;
}

interface ClearClientSessionOptions {
  intentional?: boolean;
}

/**
 * Wipe every client-side marker tied to the current session so the next login
 * is treated as a fresh entry: no cached token, no queued offline actions and
 * no residual device state that could skip full re-authentication (OTP).
 *
 * Intentionally preserves `termsAccepted`, which is a legal acceptance record
 * rather than session/device state.
 */
export function clearClientSession(options: ClearClientSessionOptions = {}): void {
  if (options.intentional) {
    markIntentionalSignOut();
  }

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
