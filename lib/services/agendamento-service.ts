import { createClient } from '@/lib/supabase';

export const agendamentoService = {
  async getAgendamentos() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('agendamentos')
      .select(`
        *,
        tatuador:perfis!agendamentos_tatuador_id_fkey(id, email)
      `)
      .order('data_hora', { ascending: true });

    if (error) throw error;
    return data;
  },

  async criarAgendamento(dados: { tatuador_id: string; data_hora: string; valor_total: number }) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('agendamentos')
      .insert([dados])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

