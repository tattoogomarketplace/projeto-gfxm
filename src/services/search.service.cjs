const { prisma } = require("./prisma.service.cjs");

const USER_SEARCH_MIN_LENGTH = 2;
const USER_SEARCH_LIMIT = 10;
const USERNAME_MAX_LENGTH = 20;
const USER_SEARCH_QUERY_PATTERN = /^@[a-z0-9_]+$/;

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function isValidUsernameSearchQuery(value) {
  if (typeof value !== "string") return false;
  if (value.length > USERNAME_MAX_LENGTH + 1) return false;
  return USER_SEARCH_QUERY_PATTERN.test(value);
}

function normalizeSearchQuery(value) {
  return String(value ?? "")
    .replace(/\s+/g, "")
    .replace(/^@+/, "")
    .toLowerCase()
    .slice(0, USERNAME_MAX_LENGTH);
}

async function searchUsuarios({ actorId, q }) {
  if (!isValidUsernameSearchQuery(q)) {
    throw httpError(400, "Consulta inválida.");
  }
  const query = normalizeSearchQuery(q);
  if (query.length < USER_SEARCH_MIN_LENGTH) return [];

  const rows = await prisma.perfil.findMany({
    where: {
      deleted_at: null,
      username: { startsWith: query },
      ...(actorId ? { id: { not: actorId } } : {}),
    },
    select: { id: true, nome: true, username: true, role: true },
    orderBy: { username: "asc" },
    take: USER_SEARCH_LIMIT,
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.nome,
    username: row.username,
    avatarUrl: null,
    role: row.role,
  }));
}

module.exports = { searchUsuarios, isValidUsernameSearchQuery };
