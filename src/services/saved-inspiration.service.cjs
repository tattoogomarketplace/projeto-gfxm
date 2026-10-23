const { prisma } = require("./prisma.service.cjs");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function isUuid(value) {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

function normalizeId(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function toggleSave(userIdRaw, postIdRaw) {
  const userId = normalizeId(userIdRaw);
  const postId = normalizeId(postIdRaw);

  if (!userId || !postId) {
    throw httpError(400, "userId e postId são obrigatórios.");
  }
  if (!isUuid(userId) || !isUuid(postId)) {
    throw httpError(400, "Identificadores inválidos.");
  }

  const post = await prisma.portfolio.findFirst({
    where: { id: postId, deleted_at: null },
    select: { id: true },
  });
  if (!post) {
    throw httpError(404, "Inspiração não encontrada.");
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const existingSave = await tx.savedInspiration.findUnique({
        where: {
          userId_postId: { userId, postId },
        },
      });

      if (existingSave) {
        await tx.savedInspiration.delete({
          where: {
            userId_postId: { userId, postId },
          },
        });
        return {
          isSaved: false,
          message: "Inspiração removida dos salvos.",
        };
      }

      await tx.savedInspiration.create({
        data: { userId, postId },
      });
      return {
        isSaved: true,
        message: "Inspiração salva.",
      };
    });
  } catch (err) {
    if (err.code === "P2002") {
      return {
        isSaved: true,
        message: "Inspiração salva.",
      };
    }
    if (err.code === "P2025") {
      return {
        isSaved: false,
        message: "Inspiração removida dos salvos.",
      };
    }
    if (err.code === "P2003") {
      throw httpError(404, "Inspiração não encontrada.");
    }
    if (err.code === "P2021" || err.code === "P2010") {
      console.error("[saved-inspiration] tabela saved_inspirations indisponível", {
        code: err.code,
        error: err instanceof Error ? err.message : String(err),
      });
      throw httpError(500, "Persistência de salvos indisponível.");
    }
    throw err;
  }
}

module.exports = { toggleSave };
