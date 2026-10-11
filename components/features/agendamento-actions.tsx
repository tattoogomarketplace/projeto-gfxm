'use client';

import { toast } from '@/lib/toast';
import { getCancelAction } from '@/lib/utils/scheduling';
import { useI18n } from '@/hooks/use-i18n';

export function AgendamentoActions({ agendamento }: { agendamento: { data_hora: string } }) {
  const actionType = getCancelAction(agendamento.data_hora);
  const { t } = useI18n();

  if (actionType === 'CONTATAR_SUPORTE') {
    return (
      <button className="bg-zinc-800 text-white px-4 py-2 rounded-lg">
        {t('cancel.contactSupport')}
      </button>
    );
  }

  return (
    <button 
      onClick={() => toast.success(t('toast.cancelProcessed'))}
      className="bg-red-900/50 text-red-400 px-4 py-2 rounded-lg"
    >
      {t('cancel.title')}
    </button>
  );
}
