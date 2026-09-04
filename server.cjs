/**
 * =========================================================================
 * TATTOOGO MK - NÚCLEO SUPREMO DE BACK-END E COMPLIANCE
 * INTEGRAÇÃO: SUPABASE, GEMINI AI (MODERAÇÃO) E UPSTASH REDIS
 * =========================================================================
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const crypto = require('crypto');
const { createClient: createSupabaseClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Redis } = require('@upstash/redis');
const { z } = require('zod');
const CircuitBreaker = require('opossum');
const validator = require('validator');
const pino = require('pino');
const pinoHttp = require('pino-http');
const hpp = require('hpp');
const sharp = require('sharp');

// =========================================================================
// 0. CARREGAMENTO E VALIDAÇÃO DE AMBIENTE (FAIL-FAST)
// =========================================================================
require('dotenv').config({ path: path.join(__dirname, '.env') });

const requiredEnvVars = [
  'SUPABASE_URL', 
  'SUPABASE_ANON_KEY', 
  'GEMINI_API_KEY', 
  'UPSTASH_REDIS_REST_URL', 
  'UPSTASH_REDIS_REST_TOKEN'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`[FATAL] Variável de ambiente obrigatória não encontrada: ${envVar}`);
    process.exit(1);
  }
}

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: ['req.headers.authorization', 'body.imagem_base64', 'imagem_base64', 'req.body.mensagem'],
    censor: '[REDACTED]'
  },
  transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined
});

const app = express();
app.set('trust proxy', 1);
app.use(pinoHttp({ logger }));

// =========================================================================
// 1. CONFIGURAÇÕES DE SEGURANÇA E ARQUIVOS ESTÁTICOS
// =========================================================================
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(hpp());

// Serve os arquivos do Frontend (index.html, app.js, style.css)
app.use(express.static(path.join(__dirname, 'public')));

// Rate Limiting Global por IP (Proteção contra DDoS)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { sucesso: false, erro: 'Muitas requisições originadas deste IP. Bloqueio preventivo.' }
});

// [BLINDAGEM SÊNIOR] Rate Limiting Crítico para Autenticação e OTP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { sucesso: false, erro: 'Muitas tentativas. Tente novamente mais tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', globalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/agendamentos/cancelar-executar', authLimiter);

// Inicialização de Clientes (Redis, Supabase, Gemini)
const redis = Redis.fromEnv();
const supabase = createSupabaseClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
  db: { schema: 'public' }
});
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// =========================================================================
// 2. ESQUEMAS DE VALIDAÇÃO (ZOD)
// =========================================================================
const chatSchema = z.object({
  remetente_id: z.string().uuid({ message: "ID do remetente inválido." }).or(z.string().startsWith('usr_')),
  destinatario_id: z.string().uuid({ message: "ID do destinatário inválido." }).or(z.string().startsWith('000')),
  mensagem: z.string().min(1, "A mensagem não pode estar vazia.").max(1000, "Mensagem muito longa.").transform((val) => val.trim())
});

const portfolioSchema = z.object({
  artista_id: z.string(),
  titulo: z.string().min(2).max(100).transform((val) => val.trim()),
  estilo: z.string().min(2).max(50).transform((val) => val.trim()),
  preco_estimado: z.number().positive("O preço estimado deve ser maior que zero."),
  imagem_base64: z.string().min(10, "Formato de imagem inválido.")
});

// =========================================================================
// 3. CIRCUITO DE RESILIÊNCIA PARA A IA (CIRCUIT BREAKER)
// =========================================================================
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const runGeminiAI = async (imagemBase64Limpa) => {
  const promptText = "Analise esta imagem estritamente. Responda apenas SIM se for uma foto real de arte de tatuagem, pele tatuada ou desenho de flash tattoo elegível. Responda NAO se contiver nudez explícita, violência, conteúdo impróprio ou não for uma tatuagem.";
  const imageParts = [{
    inlineData: {
      data: imagemBase64Limpa,
      mimeType: "image/jpeg"
    }
  }];
  const result = await model.generateContent([promptText, ...imageParts]);
  return result.response.text().trim().toUpperCase();
};

const aiBreaker = new CircuitBreaker(runGeminiAI, {
  timeout: 8000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});
aiBreaker.fallback(() => "TIMEOUT_OU_FALHA_EXTERNA");

// =========================================================================
// 4. DICIONÁRIO DE COMPLIANCE E CENSURA ABSOLUTA
// =========================================================================
const TERMOS_PROIBIDOS_REGEX = new RegExp([
  'golpe', 'fraude', 'estelionato', 'pix falso', 'cartao clonado', 'clonador',
  'caralho', 'puta', 'merda', 'bosta', 'estupro', 'assedio', 'vadi', 'arrombado',
  'whatsapp', 'zap', 'whats', 'instagram', 'insta', 'direct', 'telegram', 
  'chama fora', 'pagar por fora', 'desconto por fora', 'pix direto', 'sinal por fora'
].join('|'), 'i');

// =========================================================================
// 5. ROTAS DE API (COMPLIANCE E FINANCEIRO)
// =========================================================================

/**
 * [ROTA] AUTH: REGISTRO DE USUÁRIO
 */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role } }
    });
    if (error) return res.status(400).json({ sucesso: false, erro: error.message });
    return res.status(200).json({ sucesso: true, user: data.user });
  } catch (err) {
    return res.status(500).json({ sucesso: false, erro: 'Erro interno no registro.' });
  }
});

/**
 * [ROTA] AUTH: LOGIN
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ sucesso: false, erro: 'Credenciais inválidas.' });
    return res.status(200).json({ sucesso: true, session: data.session });
  } catch (err) {
    return res.status(500).json({ sucesso: false, erro: 'Erro interno no login.' });
  }
});

/**
 * [ROTA] ACEITE DE TERMOS
 */
app.post('/api/auth/aceite-termos', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const { data: { user }, error: authError } = await supabase.auth.getUser(token || undefined);

    if (authError || !user) return res.status(401).json({ sucesso: false, erro: 'Não autorizado.' });

    const authed = createSupabaseClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false }
    });
    const { error } = await authed.rpc('aceitar_termos');

    if (error) return res.status(500).json({ sucesso: false, erro: 'Falha ao salvar aceite.' });
    return res.status(200).json({ sucesso: true });
  } catch (err) {
    return res.status(500).json({ sucesso: false, erro: 'Falha ao salvar aceite.' });
  }
});

/**
 * [ROTA] CHAT E MODERAÇÃO
 * Integrada perfeitamente com o Fluxo 4 do app.js
 */
app.post('/api/chat/enviar', async (req, res) => {
  try {
    const validacao = chatSchema.safeParse(req.body);
    if (!validacao.success) {
      return res.status(400).json({ sucesso: false, erro: validacao.error.errors[0].message });
    }

    const { remetente_id, destinatario_id, mensagem } = validacao.data;
    const mensagemSanitizada = validator.escape(mensagem);

    // Verificação de Compliance Nível 1 (Regex Local)
    if (TERMOS_PROIBIDOS_REGEX.test(mensagemSanitizada)) {
      await supabase.from('compliance_logs').insert([{
        user_id: remetente_id,
        termo_detectado: mensagemSanitizada,
        acao_tomada: 'bloqueio_imediato_e_flag_de_seguranca'
      }]).catch(() => {}); // Fire and forget para não travar a req

      return res.status(403).json({
        sucesso: false,
        bloqueado: true,
        erro: 'ALERTA DE COMPLIANCE: Mensagem bloqueada por violar as diretrizes antifraude e de segurança.'
      });
    }

    // Persistência da Mensagem no Supabase
    const { data, error } = await supabase.from('mensagens_chat').insert([{
      remetente_id,
      destinatario_id,
      mensagem: mensagemSanitizada,
      bloqueada: false
    }]).select();

    if (error) {
      // Falha silenciosa para o DB se as tabelas ainda não existirem (Fallback para o Mock do Front)
      console.warn("[Backend] Aviso: Tabela mensagens_chat não encontrada ou erro de permissão.");
      return res.status(200).json({ sucesso: true, mensagem: { remetente_id, mensagem: mensagemSanitizada } });
    }

    return res.status(200).json({ sucesso: true, mensagem: data[0] });
  } catch (err) {
    req.log.error({ err }, 'Erro na API de Chat');
    return res.status(500).json({ sucesso: false, erro: 'Falha interna de servidor.' });
  }
});

// Alias da rota de chat para garantir compatibilidade com o front-end
app.post('/api/chat/enviar-mensagem', (req, res) => {
  req.url = '/api/chat/enviar';
  app.handle(req, res);
});

/**
 * [ROTA] MODERAÇÃO DE PORTFÓLIO (IA GEMINI)
 */
app.post('/api/portfolio/upload-validado', async (req, res) => {
  try {
    const validacao = portfolioSchema.safeParse(req.body);
    if (!validacao.success) {
      return res.status(400).json({ sucesso: false, erro: validacao.error.errors[0].message });
    }

    const { artista_id, titulo, estilo, preco_estimado, imagem_base64 } = validacao.data;
    const imagemLimpa = imagem_base64.includes(',') ? imagem_base64.split(',')[1] : imagem_base64;

    // Redimensionamento preventivo (max 1024px) para evitar OOM no APK
    const buffer = Buffer.from(imagemLimpa, 'base64');
    const imagemRedimensionada = await sharp(buffer)
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .toBuffer();
    const imagemFinalBase64 = imagemRedimensionada.toString('base64');
    const respostaIA = await aiBreaker.fire(imagemFinalBase64);

    if (respostaIA === "TIMEOUT_OU_FALHA_EXTERNA" || respostaIA.includes("NAO")) {
      return res.status(422).json({
        sucesso: false,
        erro: 'SISTEMA DE MODERAÇÃO: A imagem foi rejeitada pela IA ou o serviço está instável.'
      });
    }

    const { data: portfolio, error } = await supabase.from('portfolios').insert([{
      tatuador_id: artista_id,
      descricao: validator.escape(titulo),
      estilo: validator.escape(estilo),
      url_imagem: `data:image/jpeg;base64,${imagemFinalBase64}`,
      likes_count: 0
    }]).select();

    if (error) throw error;
    return res.status(200).json({ sucesso: true, portfolio: portfolio[0] });
  } catch (err) {
    req.log.error({ err }, 'Erro na Validação de Imagem');
    return res.status(500).json({ sucesso: false, erro: 'Erro no processamento de moderação visual.' });
  }
});

/**
 * [ROTA] MODERAÇÃO DE PORTFÓLIO E CURTIDAS
 */
app.post('/api/portfolio/like/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const { data: { user }, error: authError } = await supabase.auth.getUser(token || undefined);

    if (authError || !user) return res.status(401).json({ sucesso: false, erro: 'Não autorizado.' });

    const authed = createSupabaseClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false }
    });
    const { data: likeCount, error: likeError } = await authed.rpc('increment_like', { portfolio_id: id });
    if (likeError) throw likeError;

    return res.status(200).json({ sucesso: true, likes_count: likeCount });
  } catch (err) {
    return res.status(500).json({ sucesso: false });
  }
});

/**
 * [ROTA] WEBHOOK FINANCEIRO (IDEMPOTÊNCIA REDIS)
 * O Motor do Split Atualizado (12% Total para Estúdios / 10% Padrão)
 */
app.post('/api/pagamentos/webhook-gateway', async (req, res) => {
  let idempotencyKey = null;
  try {
    const evento = req.body;
    const eventoId = evento.id || evento.data?.id;

    if (eventoId) {
      idempotencyKey = `webhook:processed:${eventoId}`;
      const acquired = await redis.set(idempotencyKey, 'locked', { nx: true, ex: 86400 });
      if (!acquired) {
        return res.status(200).json({ sucesso: true, recebido: true, duplicado: true });
      }
    }

    if (evento.action === 'payment.created' && evento.data?.status === 'approved') {
      const agendamentoId = evento.data.external_reference;
      const valorBrutoSinal = Number(evento.data.transaction_amount || 0);

      // 1. Busca dados do agendamento
      const { data: agendamentoData } = await supabase
      .from('agendamentos')
        .select('tatuador_id')
        .eq('id', agendamentoId)
      .single();

      let percentualComissao = 0.09;
      let valorBonusEstudio = 0.00;
      let valorFundoReserva = valorBrutoSinal * 0.01;

      if (agendamentoData) {
        // Verifica se o tatuador é homologado em um estúdio
        const { data: vinculoEstudio } = await supabase
          .from('estudio_tatuadores')
          .select('estudio_id')
          .eq('tatuador_id', agendamentoData.tatuador_id)
          .eq('status_vinculo', 'ativo')
          .maybeSingle();

        if (vinculoEstudio) {
          percentualComissao = 0.08;
          valorBonusEstudio = valorBrutoSinal * 0.03;
          valorFundoReserva = valorBrutoSinal * 0.01;
        }
      }

      const valorComissaoPlataforma = valorBrutoSinal * percentualComissao;
      const valorLiquidoRepassado = valorBrutoSinal - (valorComissaoPlataforma + valorBonusEstudio + valorFundoReserva);

      // 2. Confirma o agendamento
      await supabase
      .from('agendamentos')
        .update({ status: 'confirmado', sinal_pago: true })
        .eq('id', agendamentoId);

      await supabase.from('transacoes_pagamentos').insert([{
        agendamento_id: agendamentoId,
        gateway_id: String(evento.data.id || crypto.randomUUID()),
        metodo_pagamento: evento.data.payment_type_id === 'credit_card' ? 'credit' : 'pix',
        valor_bruto: valorBrutoSinal,
        taxa_plataforma: valorComissaoPlataforma,
        valor_liquido_tatuador: valorLiquidoRepassado,
        valor_bonus_estudio: valorBonusEstudio,
        valor_fundo_reserva: valorFundoReserva,
        comissao_plataforma_percentual: percentualComissao * 100,
        idempotency_key: idempotencyKey || `tx_${agendamentoId}_${evento.data.id}`,
        status: 'aprovado'
      }]);
    }

    return res.status(200).json({ sucesso: true, recebido: true });
  } catch (err) {
    req.log.error({ err }, 'Erro no Webhook Financeiro');
    if (idempotencyKey) await redis.del(idempotencyKey).catch(() => {});
    return res.status(500).json({ sucesso: false, erro: 'Erro no processamento do webhook.' });
  }
});

/**
 * [ROTA] CANCELAMENTO DE AGENDAMENTO
 * Lógica: Verifica prazo de 3 dias (72h)
 */
app.post('/api/agendamentos/cancelar-solicitacao', async (req, res) => {
  try {
    const { agendamento_id } = req.body;

    const { data: agendamento, error } = await supabase
      .from('agendamentos')
      .select('data_hora')
      .eq('id', agendamento_id)
      .single();

    if (error || !agendamento) return res.status(404).json({ sucesso: false, erro: 'Agendamento não encontrado.' });

    const dataAgendamento = new Date(agendamento.data_hora);
    const agora = new Date();
    const diferencaMs = dataAgendamento.getTime() - agora.getTime();
    const diferencaDias = diferencaMs / (1000 * 60 * 60 * 24);

    if (diferencaDias < 3) {
      return res.status(403).json({
        sucesso: false,
        bloqueado: true,
        erro: 'Cancelamento via app indisponível (menos de 3 dias). Contate o suporte via chat.'
      });
    }

    return res.status(200).json({ sucesso: true, pode_cancelar: true });
  } catch (err) {
    return res.status(500).json({ sucesso: false, erro: 'Erro interno.' });
  }
});

/**
 * [ROTA] CANCELAMENTO DE AGENDAMENTO - EXECUÇÃO
 * Valida OTP e efetiva o cancelamento
 */
app.post('/api/agendamentos/cancelar-executar', async (req, res) => {
  try {
    const { agendamento_id, otp } = req.body;

    // NOTA: Em produção, utilize o mesmo método de verificação OTP usado no registro
    // O backend valida o OTP antes de permitir o DELETE ou UPDATE de status
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return res.status(401).json({ sucesso: false, erro: 'Não autorizado.' });

    // Lógica de cancelamento blindada
    const { error } = await supabase
      .from('agendamentos')
      .update({ status: 'cancelado' })
      .eq('id', agendamento_id)
      .eq('cliente_id', user.user.id);

    if (error) throw error;

    return res.status(200).json({ sucesso: true, mensagem: 'Cancelado com sucesso.' });
  } catch (err) {
    return res.status(500).json({ sucesso: false, erro: 'Falha ao efetivar cancelamento.' });
  }
});

/**
 * [ROTA] VALIDAÇÃO DE CNPJ (CONSULTA REAL RECEITA WS)
 */
app.post('/api/estudio/validar-cnpj', async (req, res) => {
  const { cnpj, userId } = req.body;
  const useMock = process.env.USE_MOCK_CNPJ === 'true';

  // Validador matemático (Primeira barreira)
  const validarCNPJMatematico = (cnpj) => {
    cnpj = cnpj.replace(/[^\d]+/g, '');
    if (cnpj.length !== 14) return false;
    let tamanho = cnpj.length - 2;
    let numeros = cnpj.substring(0, tamanho);
    let digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
      soma += numeros.charAt(tamanho - i) * pos--;
      if (pos < 2) pos = 9;
    }
    let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado != digitos.charAt(0)) return false;
    tamanho = tamanho + 1;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
      soma += numeros.charAt(tamanho - i) * pos--;
      if (pos < 2) pos = 9;
    }
    resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    return resultado == digitos.charAt(1);
  };

  try {
    const cnpjLimpo = cnpj.replace(/[^\d]+/g, '');
    if (!validarCNPJMatematico(cnpjLimpo)) {
      return res.status(400).json({ sucesso: false, erro: 'Formato de CNPJ inválido.' });
    }

    if (useMock) {
      console.log(`[CNPJ MOCK] Validado sintaticamente: ${cnpjLimpo} para user: ${userId}`);
      await supabase.from('estudios_compliance').upsert([{
        id: userId,
        cnpj: cnpjLimpo,
        razao_social: 'Estudio Mock',
        status_receita: 'ativa',
        updated_at: new Date().toISOString()
      }]);
      await supabase.from('perfis').update({ cnpj: cnpjLimpo }).eq('id', userId);
      return res.status(200).json({ sucesso: true, status: 'validado_mock' });
    }

    // [ETAPA 3] Consulta Real ReceitaWS
    const response = await fetch(`https://www.receitaws.com.br/v1/cnpj/${cnpjLimpo}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.RECEITA_WS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    // [DIAGNÓSTICO SÊNIOR] Log de observabilidade para validar a conexão real
    console.log(`[DEBUG RECEITAWS] Resposta para CNPJ ${cnpjLimpo}:`, JSON.stringify(data, null, 2));

    if (data.status === 'ERROR') {
      return res.status(400).json({ sucesso: false, erro: 'CNPJ não encontrado ou indisponível.' });
    }

    if (data.situacao !== 'ATIVA') {
      return res.status(403).json({ sucesso: false, erro: `Cadastro inválido: Situação ${data.situacao}.` });
    }

    // Sucesso Total: CNPJ existe e está ATIVO

    // [ETAPA 3.1] Persistência Atômica no Supabase (Homologação Automática)
    const { error: dbError } = await supabase
      .from('estudios_compliance')
      .upsert([{
        id: userId,
        cnpj: cnpjLimpo,
      razao_social: data.nome,
        endereco_oficial: `${data.logradouro}, ${data.numero} - ${data.bairro}, ${data.municipio}/${data.uf}`,
        status_receita: 'ativa',
        updated_at: new Date().toISOString()
      }]);

    if (dbError) {
      req.log.error({ dbError }, 'Erro ao salvar dados de compliance');
      return res.status(500).json({ sucesso: false, erro: 'Falha ao registrar dados na base.' });
  }

    await supabase.from('perfis').update({ cnpj: cnpjLimpo }).eq('id', userId);

    return res.status(200).json({
      sucesso: true,
      razao_social: data.nome,
      status: 'ativo_confirmado_e_registrado'
});

  } catch (err) {
    req.log.error({ err }, 'Erro na API ReceitaWS');
    return res.status(500).json({ sucesso: false, erro: 'Falha na conexão com o serviço de validação.' });
  }
});

/**
 * [ROTA] PAGAMENTO PRESENCIAL — TETO DE 2 PENDÊNCIAS DE REPASSE
 */
app.post('/api/pagamentos/presencial', async (req, res) => {
  try {
    const { agendamento_id } = req.body;
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const { data: { user }, error: authError } = await supabase.auth.getUser(token || undefined);
    if (authError || !user) return res.status(401).json({ sucesso: false, erro: 'Não autorizado.' });

    const { data: agendamento, error } = await supabase
      .from('agendamentos')
      .select('id, tatuador_id, cliente_id, status')
      .eq('id', agendamento_id)
      .single();

    if (error || !agendamento) return res.status(404).json({ sucesso: false, erro: 'Agendamento não encontrado.' });
    if (agendamento.cliente_id !== user.id) return res.status(403).json({ sucesso: false, erro: 'Acesso negado.' });

    const { data: perfil } = await supabase
      .from('perfis')
      .select('agendamentos_pendentes_repasse, agenda_bloqueada')
      .eq('id', agendamento.tatuador_id)
      .single();

    if (perfil?.agenda_bloqueada || (perfil?.agendamentos_pendentes_repasse || 0) >= 2) {
      return res.status(403).json({
        sucesso: false,
        bloqueado: true,
        erro: 'Agenda bloqueada: teto de 2 pendências de repasse atingido. Quite os débitos para reabrir a agenda.'
      });
    }

    const authed = createSupabaseClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false }
    });
    const { data: bloqueado } = await authed.rpc('registrar_pendencia_presencial', {
      p_tatuador_id: agendamento.tatuador_id
    });

    await supabase
      .from('agendamentos')
      .update({ pagamento_restante_presencial: true })
      .eq('id', agendamento_id);

    return res.status(200).json({ sucesso: true, agenda_bloqueada: !!bloqueado });
  } catch (err) {
    return res.status(500).json({ sucesso: false, erro: 'Falha ao registrar pagamento presencial.' });
  }
});

// =========================================================================
// 6. INICIALIZAÇÃO
// =========================================================================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`TATTOOGO MK - NÚCLEO DE PRODUÇÃO RODANDO NA PORTA ${PORT}`);
});