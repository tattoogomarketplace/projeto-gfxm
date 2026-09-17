const { prisma } = require("./prisma.service.cjs");
const { cacheGet, cacheSet } = require("./cache.service.cjs");

async function getFeed() {
  const key = "feed:portfolios:v1";
  const hit = await cacheGet(key);
  if (hit) return hit;

  const data = await prisma.portfolio.findMany({
    where: { deleted_at: null },
    select: { id: true, url_imagem: true, likes_count: true, estilo: true },
    orderBy: { created_at: "desc" },
    take: 24,
  });

  await cacheSet(key, data, 30);
  return data;
}

async function listArtistas(cidade, estado) {
  const key = `artistas:${cidade || "all"}:${estado || "all"}`;
  const hit = await cacheGet(key);
  if (hit) return hit;

  const data = await prisma.perfil.findMany({
    where: {
      deleted_at: null,
      role: { in: ["tatuador", "estudio"] },
      agenda_bloqueada: false,
      ...(cidade ? { cidade } : {}),
      ...(estado ? { estado } : {}),
    },
    select: { id: true, email: true, cidade: true, estado: true },
    take: 100,
  });

  await cacheSet(key, data, 60);
  return data;
}

async function listCidades() {
  const key = "geo:cidades:v1";
  const hit = await cacheGet(key);
  if (hit) return hit;

  const data = await prisma.perfil.findMany({
    where: {
      deleted_at: null,
      role: { in: ["tatuador", "estudio"] },
      cidade: { not: null },
      estado: { not: null },
    },
    select: { cidade: true, estado: true },
    orderBy: { cidade: "asc" },
    take: 1000,
  });

  const unique = Array.from(
    new Map(data.map((item) => [`${item.cidade}-${item.estado}`, item])).values()
  );

  await cacheSet(key, unique, 300);
  return unique;
}

module.exports = { getFeed, listArtistas, listCidades };
