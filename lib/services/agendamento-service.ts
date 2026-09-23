type NovoAgendamento = { tatuador_id: string; data_hora: string; valor_total: number };

export const agendamentoService = {
  async getAgendamentos() {
    return [];
  },

  async criarAgendamento(dados: NovoAgendamento) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('tattoogo_token') : null;
    const res = await fetch('/api/agendamentos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(dados),
    });
    if (!res.ok) {
      throw new Error('Falha ao criar agendamento.');
    }
    return res.json();
  }
};
