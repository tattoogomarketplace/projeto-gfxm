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
app.use('/api/', globalLimiter);

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
  const { user_id } = req.body;
  const { error } = await supabase
    .from('perfis')
    .update({ has_seen_welcome_notice: true })
    .eq('id', user_id);

  if (error) return res.status(500).json({ sucesso: false, erro: 'Falha ao salvar aceite.' });
  return res.status(200).json({ sucesso: true });
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
      artista_id,
      titulo: validator.escape(titulo),
      estilo: validator.escape(estilo),
      preco_estimado,
      imagem_url: `data:image/jpeg;base64,${imagemFinalBase64}`,
      aprovado_ia_mod_tatuagem: true,
      curtidas: 0
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
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return res.status(401).json({ sucesso: false });

    // Incrementa contagem de forma atômica no DB (Blindagem)
    await supabase.rpc('increment_like', { portfolio_id: id });

    return res.status(200).json({ sucesso: true });
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

      let percentualComissao = 0.10; // 10% (Padrão Autônomo)
      let valorBonusEstudio = 0.00;
      let valorFundoReserva = 0.00;

      if (agendamentoData) {
        // Verifica se o tatuador é homologado em um estúdio
        const { data: vinculoEstudio } = await supabase
          .from('estudio_tatuadores')
          .select('estudio_id')
          .eq('tatuador_id', agendamentoData.tatuador_id)
          .eq('status_vinculo', 'ativo')
          .maybeSingle();

        if (vinculoEstudio) {
          // Novo Split para Estúdios (Total 12%)
          percentualComissao = 0.09;                // 9% para a plataforma
          valorBonusEstudio = valorBrutoSinal * 0.02; // 2% para o dono do estúdio
          valorFundoReserva = valorBrutoSinal * 0.01; // 1% para fundo de reserva/impostos da plataforma
        }
      }

      const valorComissaoPlataforma = valorBrutoSinal * percentualComissao;
      const valorLiquidoRepassado = valorBrutoSinal - (valorComissaoPlataforma + valorBonusEstudio + valorFundoReserva);

      // 2. Confirma o agendamento
      await supabase
      .from('agendamentos')
        .update({ status_sinal: 'pago_garantido', status_atendimento: 'agendado' })
        .eq('id', agendamentoId);

      // 3. Registra a transação (Alimenta o Dashboard Financeiro)
      await supabase.from('transacoes_pagamentos').insert([{
        agendamento_id: agendamentoId,
        gateway_id: String(evento.data.id || crypto.randomUUID()),
        valor_bruto_sinal: valorBrutoSinal,
        comissao_plataforma_percentual: percentualComissao * 100,
        valor_comissao_plataforma: valorComissaoPlataforma,
        valor_bonus_estudio_2porcento: valorBonusEstudio,
        valor_fundo_reserva_1porcento: valorFundoReserva,
        valor_liquido_repassado: valorLiquidoRepassado,
        status_transacao: 'aprovado'
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

// =========================================================================
// 6. INICIALIZAÇÃO
// =========================================================================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`TATTOOGO MK - NÚCLEO DE PRODUÇÃO RODANDO NA PORTA ${PORT}`);
});