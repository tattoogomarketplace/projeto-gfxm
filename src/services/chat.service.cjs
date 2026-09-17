const { prisma } = require("./prisma.service.cjs");
const { moderateChatDuvida } = require("./gemini.service.cjs");
const { detectarTermoSaude } = require("./compliance-juridico.service.cjs");
const { emitToUser } = require("./realtime.service.cjs");

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
    "https?://",
    "mercadopago",
    "picpay",
    "pagseguro",
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

async function persistirAuditoria({ remetenteId, destinatarioId, mensagem, bloqueada, status }) {
  return prisma.mensagemChat.create({
    data: {
      remetente_id: remetenteId,
      destinatario_id: destinatarioId,
      mensagem,
      bloqueada,
      status: status || "enviado",
    },
  });
}

async function salvarMensagem({ remetenteId, destinatarioId, mensagem }) {
  return persistirAuditoria({
    remetenteId,
    destinatarioId,
    mensagem,
    bloqueada: false,
    status: "enviado",
  });
}

async function enviarDuvida({ remetenteId, destinatarioId, mensagem }) {
  const termoSaude = detectarTermoSaude(mensagem);
  if (termoSaude || isMensagemProibida(mensagem)) {
    const registro = await persistirAuditoria({
      remetenteId,
      destinatarioId,
      mensagem,
      bloqueada: true,
      status: "enviado",
    });
    await logCompliance({
      userId: remetenteId,
      termoDetectado: mensagem,
      acaoTomada: "bloqueio_imediato_e_flag_de_seguranca",
    });
    const error = new Error(
      "ALERTA DE COMPLIANCE: Mensagem bloqueada. O chat e exclusivo para duvidas e nao admite negociacao, links ou termos juridicamente restritos."
    );
    error.status = 403;
    error.bloqueado = true;
    error.mensagem = registro;
    throw error;
  }

  const vereditoIa = await moderateChatDuvida(mensagem);
  if (vereditoIa.includes("NEGOCIACAO") || vereditoIa.includes("FORA_DO_ESCOPO")) {
    const registro = await persistirAuditoria({
      remetenteId,
      destinatarioId,
      mensagem,
      bloqueada: true,
      status: "enviado",
    });
    await logCompliance({
      userId: remetenteId,
      termoDetectado: mensagem,
      acaoTomada: `moderacao_ia_${vereditoIa}`,
    });
    const error = new Error(
      "ALERTA DE COMPLIANCE: O chat e apenas para duvidas sobre o servico. Negociacao e pagamento ocorrem exclusivamente no checkout."
    );
    error.status = 403;
    error.bloqueado = true;
    error.mensagem = registro;
    throw error;
  }

  const data = await persistirAuditoria({
    remetenteId,
    destinatarioId,
    mensagem,
    bloqueada: false,
    status: "enviado",
  });

  emitToUser(destinatarioId, "chat:nova-mensagem", {
    mensagem_id: data.id,
    remetente_id: data.remetente_id,
    destinatario_id: data.destinatario_id,
    mensagem: data.mensagem,
    status: data.status,
    created_at: data.created_at,
  });
  emitToUser(remetenteId, "chat:status", {
    mensagem_id: data.id,
    status: data.status,
  });

  return data;
}

async function marcarEntregue({ mensagemId, userId }) {
  const mensagem = await prisma.mensagemChat.findFirst({
    where: { id: mensagemId, destinatario_id: userId, deleted_at: null },
  });
  if (!mensagem || mensagem.status === "lido") return mensagem;

  return prisma.mensagemChat.update({
    where: { id: mensagemId },
    data: {
      status: "entregue",
      entregue_em: mensagem.entregue_em || new Date(),
    },
  });
}

async function marcarLido({ mensagemId, userId }) {
  const mensagem = await prisma.mensagemChat.findFirst({
    where: { id: mensagemId, destinatario_id: userId, deleted_at: null },
  });
  if (!mensagem) return null;

  return prisma.mensagemChat.update({
    where: { id: mensagemId },
    data: {
      status: "lido",
      entregue_em: mensagem.entregue_em || new Date(),
      lido_em: new Date(),
    },
  });
}

async function historico({ userId, interlocutorId }) {
  return prisma.mensagemChat.findMany({
    where: {
      deleted_at: null,
      OR: [
        { remetente_id: userId, destinatario_id: interlocutorId },
        { remetente_id: interlocutorId, destinatario_id: userId },
      ],
    },
    orderBy: { created_at: "asc" },
    take: 200,
  });
}

module.exports = {
  TERMOS_PROIBIDOS_REGEX,
  isMensagemProibida,
  logCompliance,
  salvarMensagem,
  enviarDuvida,
  marcarEntregue,
  marcarLido,
  historico,
};
