/**
 * TATTOOGO MK - DEFINIÇÕES DE TIPOS (DATABASE INTEGRATION)
 * Mapeamento da Estrutura Suprema do Banco de Dados Supabase.
 */

export interface Perfil {
  id: string;
  email: string;
  role: 'cliente' | 'tatuador' | 'estudio';
  kyc_status: 'pendente' | 'em_analise' | 'aprovado' | 'rejeitado';
  cidade?: string;
  estado?: string;
  avatar_url?: string;
  created_at: string;
}

export interface Portfolio {
  id: string;
  tatuador_id: string;
  url_imagem: string;
  estilo: string;
  descricao?: string;
  likes_count: number;
  created_at: string;
}

export interface Agendamento {
  id: string;
  cliente_id: string;
  tatuador_id: string;
  data_hora: string;
  status: 'rascunho' | 'aguardando_sinal' | 'confirmado' | 'cancelado' | 'concluido';
  valor_total: number;
  sinal_pago: boolean;
  version: number;
}

export interface Transacao {
  id: string;
  agendamento_id: string;
  gateway_id: string;
  metodo_pagamento: 'pix' | 'credit';
  valor_bruto: number;
  taxa_plataforma: number;
  valor_liquido_tatuador: number;
  idempotency_key: string;
  status: string;
  created_at: string;
}
