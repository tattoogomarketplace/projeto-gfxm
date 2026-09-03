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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado.');
    const { data, error } = await supabase
      .from('agendamentos')
      .insert([{ ...dados, cliente_id: user.id, status: 'aguardando_sinal', sinal_pago: false }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

