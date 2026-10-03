export async function authedFetch(
  input: string,
  init: RequestInit = {},
  getToken?: () => Promise<string | null>
): Promise<Response> {
  const token = getToken ? await getToken() : null;
  const headers = new Headers(init.headers);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(input, {
    ...init,
    credentials: 'include',
    cache: 'no-store',
    headers,
  });
}
