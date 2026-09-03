import { createClient } from '@/lib/supabase';

export const perfilService = {
  async listarArtistas(filtros?: { cidade?: string; estado?: string }) {
    const supabase = createClient();
    let query = supabase
      .from('perfis')
      .select('id, email, cidade, estado')
      .in('role', ['tatuador', 'estudio']);

    if (filtros?.cidade) query = query.eq('cidade', filtros.cidade);
    if (filtros?.estado) query = query.eq('estado', filtros.estado);
    query = query.eq('agenda_bloqueada', false);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
};
