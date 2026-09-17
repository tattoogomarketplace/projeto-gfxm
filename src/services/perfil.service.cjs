const { prisma } = require("./prisma.service.cjs");

async function aceitarTermos(userId) {
  await prisma.perfil.update({
    where: { id: userId },
    data: { has_seen_welcome_notice: true },
  });
  return { sucesso: true };
}

module.exports = { aceitarTermos };
