export async function assertTurnstileGate(turnstileToken: string): Promise<void> {
  const token = turnstileToken.trim();
  if (!token) {
    throw new Error('TURNSTILE_REQUIRED');
  }

  const response = await fetch('/api/auth/turnstile-gate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ turnstileToken: token }),
  });

  if (!response.ok) {
    throw new Error('TURNSTILE_REQUIRED');
  }
}

export function isTurnstileGateError(error: unknown): boolean {
  return error instanceof Error && error.message === 'TURNSTILE_REQUIRED';
}
