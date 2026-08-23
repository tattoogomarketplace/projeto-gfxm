'use client';

import { getCancelAction } from '@/lib/utils/scheduling';

export function AgendamentoActions({ agendamento }: { agendamento: { data_hora: string } }) {
  const actionType = getCancelAction(agendamento.data_hora);

  if (actionType === 'CONTATAR_SUPORTE') {
    return (
      <button className="bg-zinc-800 text-white px-4 py-2 rounded-lg">
        Contatar Suporte
      </button>
    );
  }

  return (
    <button 
      onClick={() => alert("Cancelamento processado.")}
      className="bg-red-900/50 text-red-400 px-4 py-2 rounded-lg"
    >
      Cancelar Agendamento
    </button>
  );
}
