const sharp = require("sharp");
const { prisma } = require("./prisma.service.cjs");
const { moderateTattooImage } = require("./gemini.service.cjs");

async function prepareImage(imagemBase64) {
  const imagemLimpa = imagemBase64.includes(",") ? imagemBase64.split(",")[1] : imagemBase64;
  const buffer = Buffer.from(imagemLimpa, "base64");
  const imagemRedimensionada = await sharp(buffer)
    .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
  return {
    buffer: imagemRedimensionada,
    base64: imagemRedimensionada.toString("base64"),
  };
}

async function uploadValidatedPortfolio({ user, accessToken, artistaId, imagemBase64 }) {
  if (artistaId !== user.id) {
    const error = new Error("Artista inválido.");
    error.status = 403;
    throw error;
  }

  const { buffer, base64 } = await prepareImage(imagemBase64);
  const respostaIA = await moderateTattooImage(base64);

  if (respostaIA === "TIMEOUT_OU_FALHA_EXTERNA" || respostaIA.includes("NAO")) {
    const error = new Error(
      "SISTEMA DE MODERAÇÃO: A imagem foi rejeitada pela IA ou o serviço está instável."
    );
    error.status = 422;
    throw error;
  }

  void buffer;
  void accessToken;
  // TODO: Refatorar para Prisma
  // const storage = getStorageClient(accessToken);
  // const filePath = `${user.id}/${Date.now()}.jpg`;
  // const { error: uploadError } = await storage.storage
  //   .from("portfolios")
  //   .upload(filePath, buffer, { contentType: "image/jpeg", upsert: false });
  // if (uploadError) throw uploadError;
  // const { data: publicData } = storage.storage.from("portfolios").getPublicUrl(filePath);
  // const urlImagem = publicData?.publicUrl;
  const error = new Error("Upload de storage pendente de migracao (Fase 3).");
  error.status = 501;
  throw error;

  // TODO: Refatorar para Prisma
  // const portfolio = await prisma.portfolio.create({
  //   data: {
  //     tatuador_id: user.id,
  //     descricao: validator.escape(titulo),
  //     estilo: validator.escape(estilo),
  //     url_imagem: urlImagem,
  //     likes_count: 0,
  //   },
  // });
  // await cacheDel("feed:portfolios:v1");
  // return portfolio;
}

async function incrementLike(userId, portfolioId) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.portfolioLike.findUnique({
      where: {
        user_id_portfolio_id: {
          user_id: userId,
          portfolio_id: portfolioId,
        },
      },
    });

    if (existing && !existing.deleted_at) {
      const current = await tx.portfolio.findUnique({
        where: { id: portfolioId },
        select: { likes_count: true },
      });
      return current?.likes_count || 0;
    }

    if (existing && existing.deleted_at) {
      await tx.portfolioLike.update({
        where: {
          user_id_portfolio_id: {
            user_id: userId,
            portfolio_id: portfolioId,
          },
        },
        data: { deleted_at: null },
      });
    } else {
      await tx.portfolioLike.create({
        data: {
          user_id: userId,
          portfolio_id: portfolioId,
        },
      });
    }

    const updated = await tx.portfolio.update({
      where: { id: portfolioId },
      data: { likes_count: { increment: 1 } },
      select: { likes_count: true },
    });

    return updated.likes_count;
  });
}

module.exports = { uploadValidatedPortfolio, incrementLike };
