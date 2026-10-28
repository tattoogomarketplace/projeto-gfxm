export const queryKeys = {
  agendaSessions: ['agenda', 'sessions'] as const,
  agendamentos: ['agendamentos'] as const,
  chatConversas: (category: string) => ['chat', 'conversas', category] as const,
  chatHistorico: (peerId: string) => ['chat', 'historico', peerId] as const,
  perfilEnsure: ['perfil', 'ensure'] as const,
};
