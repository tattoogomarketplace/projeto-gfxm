const COOLDOWN_MS = 500;

let refreshing = false;
let cooldownUntil = 0;
let cooldownTimer = 0;

function clearCooldownTimer() {
  if (!cooldownTimer) return;
  if (typeof window !== 'undefined') {
    window.clearTimeout(cooldownTimer);
  }
  cooldownTimer = 0;
}

export function armRefreshRecoveryLock() {
  refreshing = true;
  cooldownUntil = 0;
  clearCooldownTimer();
}

export function releaseRefreshRecoveryLock() {
  refreshing = false;
  cooldownUntil = Date.now() + COOLDOWN_MS;
  clearCooldownTimer();
  if (typeof window === 'undefined') return;
  cooldownTimer = window.setTimeout(() => {
    cooldownTimer = 0;
    cooldownUntil = 0;
  }, COOLDOWN_MS);
}

export function isRefreshRecoveryLocked(): boolean {
  if (refreshing) return true;
  return Date.now() < cooldownUntil;
}

export function guardRefreshRecoveryClick(event?: {
  preventDefault: () => void;
  stopPropagation: () => void;
}): boolean {
  if (!isRefreshRecoveryLocked()) return false;
  event?.preventDefault();
  event?.stopPropagation();
  return true;
}
