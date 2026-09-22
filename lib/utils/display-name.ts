type UserMetadata = {
  full_name?: string;
  nome?: string;
  name?: string;
} | null | undefined;

export function resolveDisplayName(
  metadata?: UserMetadata,
  fallback = 'Artista',
  perfilNome?: string | null
): string {
  const raw = perfilNome || metadata?.full_name || metadata?.nome || metadata?.name || '';
  const name = raw.trim();
  if (!name) return fallback;
  return name.split(/\s+/)[0];
}

export function resolveFullName(
  metadata?: UserMetadata,
  fallback = '',
  perfilNome?: string | null
): string {
  const raw = perfilNome || metadata?.full_name || metadata?.nome || metadata?.name || '';
  const name = raw.trim();
  return name || fallback;
}
