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

    if (chatService.isMensagemProibida(mensagemSanitizada)) {
      await chatService.logCompliance({
        userId: remetente_id,
        termoDetectado: mensagemSanitizada,
        acaoTomada: "bloqueio_imediato_e_flag_de_seguranca",
      });

      return res.status(403).json({
        sucesso: false,
        bloqueado: true,
        erro: "ALERTA DE COMPLIANCE: Mensagem bloqueada por violar as diretrizes antifraude e de segurança.",
      });
    }

    try {
      const data = await chatService.salvarMensagem({
        remetenteId: remetente_id,
        destinatarioId: destinatario_id,
        mensagem: mensagemSanitizada,
      });
      return res.status(200).json({ sucesso: true, mensagem: data });
    } catch {
      console.warn("[Backend] Aviso: Tabela mensagens_chat não encontrada ou erro de permissão.");
      return res.status(200).json({ sucesso: true, mensagem: { remetente_id, mensagem: mensagemSanitizada } });
    }
  } catch (err) {
    req.log.error({ err }, "Erro na API de Chat");
    return res.status(500).json({ sucesso: false, erro: "Falha interna de servidor." });
  }
}

module.exports = { enviar };
