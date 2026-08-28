'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agendamentoService } from '@/lib/services/agendamento-service';

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
    },
  });
};
