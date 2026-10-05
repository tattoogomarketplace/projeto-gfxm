import type { Agendamento } from '@/lib/types/database';

export type NovoAgendamento = {
  tatuador_id: string;
  data_hora: string;
  valor_total: number;
  extras?: Array<{ descricao?: string; valor?: number }>;
};

export class AgendamentoClientError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'AgendamentoClientError';
  }
}

function conflictMessage(status: number, fallback: string): string {
  if (status === 409) {
    return fallback || 'Este horário acabou de ser reservado. Escolha outro slot.';
  }
  return fallback;
}

export const agendamentoService = {
  async getAgendamentos(): Promise<Agendamento[]> {
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
      credentials: 'include',
      cache: 'no-store',
      body: JSON.stringify(dados),
    });
    const payload = (await res.json().catch(() => ({}))) as { erro?: string; sucesso?: boolean };
    if (!res.ok) {
      throw new AgendamentoClientError(
        res.status,
        conflictMessage(res.status, payload.erro || 'Falha ao criar agendamento.')
      );
    }
    return payload;
  },
};
