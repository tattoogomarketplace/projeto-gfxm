'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { agendamentoService, AgendamentoClientError } from '@/lib/services/agendamento-service';

export const useAgendamentos = () => {
  return useQuery({
    queryKey: ['agendamentos'],
    queryFn: () => agendamentoService.getAgendamentos(),
  });
};

export const useCriarAgendamento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: agendamentoService.criarAgendamento,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      toast.success('Horário reservado.', {
        description: 'O sinal de 25% trava este slot enquanto o pagamento é confirmado.',
      });
    },
    onError: (error) => {
      const status = error instanceof AgendamentoClientError ? error.status : 0;
      const message = error instanceof Error ? error.message : 'Falha ao criar agendamento.';
      if (status === 409) {
        toast.error('Horário indisponível.', {
          description: message,
        });
        return;
      }
      toast.error('Não foi possível concluir o agendamento.', {
        description: message,
      });
    },
  });
};
