const { prisma } = require("../services/prisma.service.cjs");
const { geminiApiKey } = require("../config/env.cjs");

async function verify(req, res) {
  const role = req.user.role || req.perfil?.role;
  if (role !== "tatuador" && role !== "estudio") {
    return res.status(403).json({
      sucesso: false,
      erro: "Verificação profissional restrita a tatuadores e estúdios.",
    });
  }
  if (!geminiApiKey) {
    return res.status(503).json({
      sucesso: false,
      erro: "Validação indisponível. Configure GEMINI_API_KEY.",
    });
  }

  const perfil = await prisma.perfil.findFirst({
    where: { id: req.user.id, deleted_at: null },
    select: { id: true, kyc_status: true },
  });
  if (!perfil) {
    return res.status(404).json({ sucesso: false, erro: "Perfil não encontrado." });
  }

  await prisma.perfil.updateMany({
    where: { id: perfil.id, clerk_id: req.user.clerkId, deleted_at: null },
    data: { kyc_status: "em_analise" },
  });

  return res.status(202).json({
    sucesso: true,
    status: "em_analise",
    approved: false,
    reason: "Credenciais recebidas. Análise em andamento.",
  });
}

module.exports = { verify };
