const MIGRATION_MESSAGE =
  "Fase 1: autenticacao Supabase desativada. Clerk entra na Fase 2.";

export const supabase = {
  auth: {
    getUser: async () => {
      throw new Error(MIGRATION_MESSAGE);
    },
    signOut: async () => {
      throw new Error(MIGRATION_MESSAGE);
    },
    updateUser: async () => {
      throw new Error(MIGRATION_MESSAGE);
    },
    signUp: async () => {
      throw new Error(MIGRATION_MESSAGE);
    },
  },
  from: () => {
    throw new Error(MIGRATION_MESSAGE);
  },
  rpc: async () => {
    throw new Error(MIGRATION_MESSAGE);
  },
};

export const processPaymentMock = async (agendamentoId: string, amount: number) => {
  console.log(`[GATEWAY MOCK] Processando sinal de 25% (R$ ${amount * 0.25}) para ${agendamentoId}...`);
  return { success: true, transactionId: `mock_tx_${Date.now()}` };
};

export const validateCNPJMock = async (cnpj: string) => {
  console.log(`[CNPJ MOCK] Validando CNPJ: ${cnpj}...`);
  return { isValid: true, verifiedAt: new Date().toISOString() };
};
