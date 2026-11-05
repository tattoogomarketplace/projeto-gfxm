const { prisma } = require("./prisma.service.cjs");

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function prismaCode(error) {
  if (!error || typeof error !== "object") return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

function formatHandle(username, clerkId) {
  const handle = typeof username === "string" ? username.trim().replace(/^@+/, "") : "";
  if (handle) return `@${handle}`;
  return `@${String(clerkId || "").slice(0, 8)}`;
}

async function registerViewBatch({ postIds, visitorToken, userId }) {
  const uniquePostIds = Array.from(new Set((postIds || []).filter(Boolean)));
  const token = String(visitorToken || "").trim();
  if (uniquePostIds.length === 0) {
    return { success: true, registered: 0 };
  }
  if (token.length < 8 || token.length > 128) {
    throw httpError(400, "Payload de visualizações inválido.");
  }

  const registered = await prisma.$transaction(async (tx) => {
    let count = 0;
    const existingPosts = await tx.post.findMany({
      where: { id: { in: uniquePostIds } },
      select: { id: true },
    });
    const validIds = existingPosts.map((post) => post.id);
    if (validIds.length === 0) return 0;

    const alreadyViewed = await tx.postView.findMany({
      where: userId
        ? { postId: { in: validIds }, userId }
        : { postId: { in: validIds }, visitorToken: token },
      select: { postId: true },
    });
    const seen = new Set(alreadyViewed.map((row) => row.postId));

    for (const postId of validIds) {
      if (seen.has(postId)) continue;
      try {
        await tx.postView.create({
          data: { postId, userId: userId || null, visitorToken: token },
        });
        await tx.post.update({
          where: { id: postId },
          data: { viewsCount: { increment: 1 } },
        });
        count += 1;
      } catch (error) {
        const code = prismaCode(error);
        if (code === "P2002" || code === "P2003") continue;
        throw error;
      }
    }
    return count;
  });

  return { success: true, registered };
}

async function getPostViewers(postId) {
  const id = String(postId || "").trim();
  if (!id) throw httpError(400, "Post inválido.");

  const post = await prisma.post.findUnique({
    where: { id },
    select: { id: true, viewsCount: true },
  });
  if (!post) throw httpError(404, "Post não encontrado.");

  const [anonymousCount, registeredViews] = await Promise.all([
    prisma.postView.count({ where: { postId: post.id, userId: null } }),
    prisma.postView.findMany({
      where: { postId: post.id, userId: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 80,
      select: { userId: true },
    }),
  ]);

  const clerkIds = Array.from(
    new Set(registeredViews.map((row) => row.userId).filter(Boolean))
  );

  const profiles =
    clerkIds.length === 0
      ? []
      : await prisma.perfil.findMany({
          where: { clerk_id: { in: clerkIds }, deleted_at: null },
          select: { clerk_id: true, username: true, nome: true },
        });

  const profileByClerk = new Map(profiles.map((perfil) => [perfil.clerk_id || "", perfil]));
  const viewers = clerkIds.map((clerkId) => {
    const perfil = profileByClerk.get(clerkId);
    return {
      id: clerkId,
      username: formatHandle(perfil?.username ?? perfil?.nome ?? null, clerkId),
      avatarUrl: null,
    };
  });

  return {
    success: true,
    anonymousCount,
    viewers,
    viewsCount: post.viewsCount,
  };
}

module.exports = { registerViewBatch, getPostViewers };
