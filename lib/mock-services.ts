import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Mock Gateway: Simula processamento de pagamento
export const processPaymentMock = async (agendamentoId: string, amount: number) => {
  console.log(`[GATEWAY MOCK] Processando sinal de 25% (R$ ${amount * 0.25}) para ${agendamentoId}...`);
  return { success: true, transactionId: `mock_tx_${Date.now()}` };
};

// Mock CNPJ: Simula validação de documentos
export const validateCNPJMock = async (cnpj: string) => {
  console.log(`[CNPJ MOCK] Validando CNPJ: ${cnpj}...`);
  return { isValid: true, verifiedAt: new Date().toISOString() };
};
