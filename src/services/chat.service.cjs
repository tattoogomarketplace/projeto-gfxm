const { prisma } = require("./prisma.service.cjs");

const TERMOS_PROIBIDOS_REGEX = new RegExp(
  [
    "golpe",
    "fraude",
    "estelionato",
    "pix falso",
    "cartao clonado",
    "clonador",
    "caralho",
    "puta",
    "merda",
    "bosta",
    "estupro",
    "assedio",
    "vadi",
    "arrombado",
    "whatsapp",
    "zap",
    "whats",
    "instagram",
    "insta",
    "direct",
    "telegram",
    "chama fora",
    "pagar por fora",
    "desconto por fora",
    "pix direto",
    "sinal por fora",
  ].join("|"),
  "i"
);

function isMensagemProibida(mensagem) {
  return TERMOS_PROIBIDOS_REGEX.test(mensagem);
}

async function logCompliance({ userId, termoDetectado, acaoTomada }) {
  try {
    await prisma.complianceLog.create({
      data: {
        user_id: userId,
        termo_detectado: termoDetectado,
        acao_tomada: acaoTomada,
      },
    });
  } catch {
    return;
  }
}

async function salvarMensagem({ remetenteId, destinatarioId, mensagem }) {
  return prisma.mensagemChat.create({
    data: {
      remetente_id: remetenteId,
      destinatario_id: destinatarioId,
      mensagem,
      bloqueada: false,
    },
  });
}

module.exports = {
  TERMOS_PROIBIDOS_REGEX,
  isMensagemProibida,
  logCompliance,
  salvarMensagem,
};
