export async function bearerHeaders(
  getToken?: () => Promise<string | null>,
  extra?: Record<string, string>
): Promise<HeadersInit> {
  const clerkToken = getToken ? await getToken().catch(() => null) : null;
  const stored = typeof window !== 'undefined' ? localStorage.getItem('tattoogo_token') : null;
  const token = clerkToken || stored;
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
