const { z } = require("zod");
const agendamentoService = require("../services/agendamento.service.cjs");

const uuidSchema = z.string().trim().uuid("Identificador inválido.");

const extraSchema = z
  .object({
    descricao: z.string().trim().max(160).optional(),
    valor: z.coerce.number().finite().gte(0).lte(999999.99).optional(),
  })
  .strict();

const createSchema = z
  .object({
    tatuador_id: uuidSchema,
    data_hora: z
      .string()
      .trim()
      .min(10, "Data inválida.")
      .max(40, "Data inválida.")
      .refine((value) => !Number.isNaN(Date.parse(value)), "Data inválida."),
    valor_total: z.coerce.number().finite().gt(0).lte(999999.99),
    cliente_id: uuidSchema.optional(),
    extras: z.array(extraSchema).max(20).optional(),
  })
  .strict();

const cancelSchema = z
  .object({
    agendamento_id: uuidSchema,
  })
  .strict();

const cancelExecutarSchema = z
  .object({
    agendamento_id: uuidSchema,
    otp: z.string().trim().regex(/^\d{6}$/, "Código OTP obrigatório."),
  })
  .strict();

function invalidPayload(error) {
  const message = error.issues?.[0]?.message || error.errors?.[0]?.message || "Payload inválido.";
  return { sucesso: false, erro: message, codigo: "INVALID_PAYLOAD" };
}

async function listar(req, res) {
  try {
    const result = await agendamentoService.listarAgendamentos({
      user: req.user,
    });
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        sucesso: false,
        erro: err.message,
      });
    }
    req.log.error({ err }, "Erro ao listar agendamentos");
    return res.status(500).json({ sucesso: false, erro: "Falha ao carregar agendamentos." });
  }
}

async function criar(req, res) {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(invalidPayload(parsed.error));
    }
    const { tatuador_id, data_hora, valor_total, extras, cliente_id } = parsed.data;
    const result = await agendamentoService.criarAgendamento({
      user: req.user,
      tatuadorId: tatuador_id,
      dataHora: data_hora,
      valorTotal: valor_total,
      extras,
      clienteId: cliente_id,
    });
    return res.status(201).json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        sucesso: false,
        bloqueado: err.bloqueado || undefined,
        erro: err.message,
      });
    }
    req.log.error({ err }, "Erro ao criar agendamento");
    return res.status(500).json({ sucesso: false, erro: "Falha ao criar agendamento." });
  }
}

async function cancelarSolicitacao(req, res) {
  try {
    const parsed = cancelSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(invalidPayload(parsed.error));
    }
    if (!req.user.email) {
      return res.status(401).json({ sucesso: false, erro: "Não autorizado." });
    }
    const result = await agendamentoService.solicitarCancelamento({
      agendamentoId: parsed.data.agendamento_id,
      user: req.user,
    });
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        sucesso: false,
        bloqueado: err.bloqueado || undefined,
        erro: err.message,
      });
    }
    return res.status(500).json({ sucesso: false, erro: "Erro interno." });
  }
}

async function cancelarExecutar(req, res) {
  try {
    const parsed = cancelExecutarSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(invalidPayload(parsed.error));
    }
    if (!req.user.email) {
      return res.status(401).json({ sucesso: false, erro: "Não autorizado." });
    }
    const result = await agendamentoService.executarCancelamento({
      agendamentoId: parsed.data.agendamento_id,
      otp: parsed.data.otp,
      user: req.user,
    });
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ sucesso: false, erro: err.message });
    }
    return res.status(500).json({ sucesso: false, erro: "Falha ao efetivar cancelamento." });
  }
}

module.exports = { listar, criar, cancelarSolicitacao, cancelarExecutar };
