async function fromCatalogoApi<T>(path: string): Promise<T | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch(path, { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(timer);
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data as T) ?? null;
  } catch {
    return null;
  }
}

export async function getCachedFeed() {
  const cached = await fromCatalogoApi<Array<{ id: string; url_imagem: string; likes_count: number; estilo: string }>>('/api/catalogo/feed');
  if (cached) return cached;
  const { createClient } = await import('@/lib/supabase');
  const supabase = createClient();
  const { data } = await supabase
    .from('portfolios')
    .select('id, url_imagem, likes_count, estilo')
    .order('created_at', { ascending: false })
    .limit(24);
  return data || [];
}

export async function getCachedArtistas(filtros?: { cidade?: string; estado?: string }) {
  const qs = new URLSearchParams();
  if (filtros?.cidade) qs.set('cidade', filtros.cidade);
  if (filtros?.estado) qs.set('estado', filtros.estado);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const cached = await fromCatalogoApi<Array<{ id: string; email: string; cidade: string | null; estado: string | null }>>(`/api/catalogo/artistas${suffix}`);
  if (cached) return cached;
  return null;
}

export async function getCachedCidades() {
  const cached = await fromCatalogoApi<Array<{ cidade: string; estado: string }>>('/api/catalogo/cidades');
  if (cached) return cached;
  return null;
}
