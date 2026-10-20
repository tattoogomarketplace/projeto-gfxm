export function artistProfileHref(artist: {
  id?: string | null;
  username?: string | null;
}): string {
  const username = artist.username?.trim();
  if (username) return `/dashboard/artistas/${encodeURIComponent(username)}`;
  const id = artist.id?.trim();
  if (id) return `/dashboard/artistas/${encodeURIComponent(id)}`;
  return '/dashboard/artistas';
}
