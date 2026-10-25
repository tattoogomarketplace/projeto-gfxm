'use client';

import { useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { agendamentoService, AgendamentoClientError } from '@/lib/services/agendamento-service';
import { t } from '@/lib/i18n/store';
import { apiErrorMessage } from '@/lib/error-handler';

export const useAgendamentos = () => {
  const { getToken } = useAuth();
  const tokenFn = useCallback(() => getToken({ skipCache: true }), [getToken]);

  return useQuery({
    queryKey: ['agendamentos'],
    queryFn: () => agendamentoService.getAgendamentos(tokenFn),
  });
};

export const useCriarAgendamento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: agendamentoService.criarAgendamento,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      toast.success(t('toast.scheduleBooked'), {
        description: t('toast.scheduleBookedHint'),
      });
    },
    onError: (error) => {
      const status = error instanceof AgendamentoClientError ? error.status : 0;
      if (status === 409) {
        toast.error(t('toast.scheduleUnavailable'));
        return;
      }
      toast.error(apiErrorMessage(error));
    },
  });
};
