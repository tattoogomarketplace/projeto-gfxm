/**
 * TATTOOGO MK - DEFINIÇÕES DE TIPOS (DATABASE INTEGRATION)
 * Mapeamento da Estrutura Suprema do Banco de Dados Supabase.
 */

export interface BankAccount {
  banco?: string;
  agencia?: string;
  conta?: string;
  tipo?: string;
  pix?: string;
  masked?: string;
}

export interface Perfil {
  id: string;
  email: string;
  nome?: string | null;
  cpf?: string | null;
  role: 'cliente' | 'tatuador' | 'estudio';
  kyc_status: 'pendente' | 'em_analise' | 'aprovado' | 'rejeitado' | 'nao_aplicavel';
  has_seen_welcome_notice?: boolean;
  bank_account?: BankAccount | string | null;
  cidade?: string;
  estado?: string;
  latitude?: number | null;
  longitude?: number | null;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  } | null;
  cnpj?: string;
  agendamentos_pendentes_repasse?: number;
  agenda_bloqueada?: boolean;
  avatar_url?: string;
  created_at: string;
  deleted_at?: string | null;
}

export interface Portfolio {
  id: string;
  tatuador_id: string;
  url_imagem: string;
  estilo: string;
  body_part?: string;
  session_duration?: string;
  is_healed?: boolean;
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
  valor_sinal?: number;
  sinal_pago: boolean;
  pagamento_restante_presencial?: boolean;
  waiver_signed?: boolean;
  session_status?: 'ACTION_NEEDED' | 'AWAITING_PAYMENT' | 'CONFIRMED' | 'COMPLETED' | null;
  version: number;
}

export interface ArtistaResumo {
  id: string;
  email: string;
  cidade?: string | null;
  estado?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface FeedItem {
  id: string;
  url_imagem: string;
  estilo: string;
  body_part?: string;
  session_duration?: string;
  is_healed?: boolean;
  likes_count: number;
}

export interface AgendamentoResumo {
  id: string;
  data_hora: string;
  status: string;
  cliente_id?: string;
}

export interface TatuadorVinculo {
  id?: string;
  tatuador_id?: string;
  email?: string | null;
  kyc_status?: string | null;
  perfis?: {
    id?: string;
    email?: string | null;
    kyc_status?: string | null;
  } | null;
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
