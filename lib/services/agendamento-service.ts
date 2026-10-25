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

async function authHeaders(
  extra?: HeadersInit,
  getToken?: () => Promise<string | null>
): Promise<Headers> {
  const headers = new Headers(extra);
  const clerkToken = getToken ? await getToken() : null;
  if (clerkToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${clerkToken}`);
  } else if (typeof window !== 'undefined' && !headers.has('Authorization')) {
    const token = localStorage.getItem('tattoogo_token');
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}

export const agendamentoService = {
  async getAgendamentos(getToken?: () => Promise<string | null>): Promise<Agendamento[]> {
    const res = await fetch('/api/agendamentos', {
      method: 'GET',
      headers: await authHeaders(undefined, getToken),
      credentials: 'include',
      cache: 'no-store',
    });
    const payload = (await res.json().catch(() => ({}))) as {
      agendamentos?: Agendamento[];
      erro?: string;
      sucesso?: boolean;
    };
    if (!res.ok) {
      throw new AgendamentoClientError(
        res.status,
        payload.erro || 'Falha ao carregar agendamentos.'
      );
    }
    return Array.isArray(payload.agendamentos) ? payload.agendamentos : [];
  },

  async criarAgendamento(dados: NovoAgendamento) {
    const res = await fetch('/api/agendamentos', {
      method: 'POST',
      headers: await authHeaders({ 'Content-Type': 'application/json' }),
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
