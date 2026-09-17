const { z } = require("zod");
const validator = require("validator");
const chatService = require("../services/chat.service.cjs");

const chatSchema = z.object({
  remetente_id: z.string().uuid({ message: "ID do remetente inválido." }).or(z.string().startsWith("usr_")),
  destinatario_id: z.string().uuid({ message: "ID do destinatário inválido." }).or(z.string().startsWith("000")),
  mensagem: z
    .string()
    .min(1, "A mensagem não pode estar vazia.")
    .max(1000, "Mensagem muito longa.")
    .transform((val) => val.trim()),
});

async function enviar(req, res) {
  try {
    const validacao = chatSchema.safeParse(req.body);
    if (!validacao.success) {
      const message = validacao.error.issues?.[0]?.message || validacao.error.errors?.[0]?.message;
      return res.status(400).json({ sucesso: false, erro: message });
    }

    const { remetente_id, destinatario_id, mensagem } = validacao.data;
    const mensagemSanitizada = validator.escape(mensagem);

    if (req.user && remetente_id !== req.user.id && !String(remetente_id).startsWith("usr_")) {
      return res.status(403).json({ sucesso: false, erro: "Remetente nao corresponde a sessao." });
    }

    try {
      const data = await chatService.enviarDuvida({
        remetenteId: req.user?.id || remetente_id,
        destinatarioId: destinatario_id,
        mensagem: mensagemSanitizada,
      });
      return res.status(200).json({ sucesso: true, mensagem: data, status: data.status });
    } catch (err) {
      if (err.status === 403) {
        return res.status(403).json({
          sucesso: false,
          bloqueado: true,
          erro: err.message,
          mensagem: err.mensagem,
        });
      }
      throw err;
    }
  } catch (err) {
    req.log.error({ err }, "Erro na API de Chat");
    return res.status(500).json({ sucesso: false, erro: "Falha interna de servidor." });
  }
}

async function historico(req, res) {
  try {
    const interlocutorId = req.query.interlocutor_id;
    if (!interlocutorId || typeof interlocutorId !== "string") {
      return res.status(400).json({ sucesso: false, erro: "interlocutor_id obrigatorio." });
    }
    const data = await chatService.historico({
      userId: req.user.id,
      interlocutorId,
    });
    return res.status(200).json({ sucesso: true, data });
  } catch (err) {
    req.log.error({ err }, "Erro ao carregar historico de chat");
    return res.status(500).json({ sucesso: false, erro: "Falha ao carregar historico." });
  }
}

async function marcarLido(req, res) {
  try {
    const { mensagem_id } = req.body;
    const atualizado = await chatService.marcarLido({
      mensagemId: mensagem_id,
      userId: req.user.id,
    });
    if (!atualizado) {
      return res.status(404).json({ sucesso: false, erro: "Mensagem nao encontrada." });
    }
    return res.status(200).json({ sucesso: true, mensagem: atualizado });
  } catch {
    return res.status(500).json({ sucesso: false, erro: "Falha ao marcar como lida." });
  }
}

module.exports = { enviar, historico, marcarLido };
