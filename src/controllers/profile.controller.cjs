const { prisma } = require("../services/prisma.service.cjs");
const { normalizeUsername } = require("../services/username.service.cjs");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const USERNAME_PATTERN = /^[a-z0-9_]+$/;

function parseRole(value) {
  if (value === "tatuador" || value === "estudio") return value;
  return "cliente";
}

async function publicByUsername(req, res) {
  try {
    const identifier = decodeURIComponent(String(req.params.username || "")).trim();
    const byId = UUID_RE.test(identifier);
    const username = byId ? null : normalizeUsername(identifier).slice(0, 20);
    if (!byId && (!username || !USERNAME_PATTERN.test(username))) {
      return res.status(400).json({ sucesso: false, erro: "Usuário inválido." });
    }

    const perfil = await prisma.perfil.findFirst({
      where: {
        deleted_at: null,
        statusConta: "ATIVO",
        ...(byId ? { id: identifier } : { username }),
      },
      select: {
        id: true,
        nome: true,
        username: true,
        role: true,
        cidade: true,
        estado: true,
        kyc_status: true,
      },
    });
    if (!perfil) {
      return res.status(404).json({ sucesso: false, erro: "Perfil não encontrado." });
    }

    const media =
      perfil.role === "tatuador"
        ? await prisma.portfolio.findMany({
            where: { tatuador_id: perfil.id, deleted_at: null },
            orderBy: { created_at: "desc" },
            take: 24,
            select: { id: true, url_imagem: true, estilo: true },
          })
        : [];

    return res.status(200).json({
      sucesso: true,
      profile: {
        id: perfil.id,
        name: (perfil.nome || "").trim(),
        username: perfil.username,
        role: parseRole(perfil.role),
        avatarUrl: null,
        cidade: perfil.cidade,
        estado: perfil.estado,
        verified: perfil.kyc_status === "aprovado",
        metrics: { posts: media.length, followers: 0, following: 0 },
        media: media.map((item) => ({
          id: item.id,
          imageUrl: item.url_imagem,
          alt: item.estilo || perfil.nome || "",
        })),
      },
    });
  } catch (err) {
    req.log?.error({ err }, "[profile/:username] falha");
    return res.status(500).json({ sucesso: false, erro: "Falha ao carregar o perfil público." });
  }
}

module.exports = { publicByUsername };
