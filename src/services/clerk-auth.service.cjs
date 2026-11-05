const { createHash } = require("crypto");
const { prisma } = require("./prisma.service.cjs");
const { ensurePerfilForClerkIdentity } = require("./ensure-perfil.service.cjs");

const SESSION_COOKIE = "__session";

function getInstanceCookieSuffix() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) return null;
  return createHash("sha1")
    .update(publishableKey)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .slice(0, 8);
}

function parseCookieHeader(header) {
  const cookies = {};
  if (!header) return cookies;
  for (const part of String(header).split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (!name) continue;
    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
  }
  return cookies;
}

function sessionCookieNames(cookies) {
  const suffix = getInstanceCookieSuffix();
  const preferred = suffix ? `${SESSION_COOKIE}_${suffix}` : null;
  return Object.keys(cookies)
    .filter((name) => name === SESSION_COOKIE || name.startsWith(`${SESSION_COOKIE}_`))
    .sort((a, b) => {
      if (a === preferred) return -1;
      if (b === preferred) return 1;
      if (a === SESSION_COOKIE) return 1;
      if (b === SESSION_COOKIE) return -1;
      return 0;
    });
}

function extractBearerToken(req) {
  const authHeader = (req && req.headers && req.headers.authorization) || "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }

  const cookieHeader =
    (req && req.headers && (req.headers.cookie || req.headers.Cookie)) || "";
  const cookies = parseCookieHeader(cookieHeader);
  for (const name of sessionCookieNames(cookies)) {
    const token = cookies[name];
    if (token) return token;
  }

  return null;
}

function claimsFromPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return { email: "", nome: null, role: null };
  }
  const email = String(payload.email || payload.email_address || "").trim().toLowerCase();
  const nome = String(payload.name || payload.full_name || "").trim() || null;
  const metadata = payload.metadata || payload.public_metadata || payload.publicMetadata || {};
  const role =
    metadata.role === "tatuador" || metadata.role === "estudio" || metadata.role === "cliente"
      ? metadata.role
      : null;
  return { email, nome, role };
}

function toAuthUser(perfil, clerkId) {
  return {
    id: perfil.id,
    clerkId,
    email: perfil.email,
    role: perfil.role,
  };
}

async function verifyClerkToken(token) {
  if (!token) return null;
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) return null;
  const { verifyToken } = require("@clerk/backend");
  return verifyToken(token, { secretKey });
}

/**
 * Resolve o usuario autenticado. JWT valido sem linha em `perfis` dispara
 * provisionamento (nao 401). Cookie `__session` e fallback do Bearer.
 */
async function getUserFromToken(token) {
  if (!token) return null;

  let payload;
  try {
    payload = await verifyClerkToken(token);
  } catch {
    return null;
  }

  const clerkId = payload && payload.sub;
  if (!clerkId) return null;

  let perfil = await prisma.perfil.findFirst({
    where: { clerk_id: clerkId },
    select: { id: true, email: true, role: true, deleted_at: true },
  });

  if (!perfil) {
    const claims = claimsFromPayload(payload);
    perfil = await ensurePerfilForClerkIdentity({
      clerkId,
      emailHint: claims.email,
      nomeHint: claims.nome,
      roleHint: claims.role,
    });
  }

  if (!perfil) return null;
  return toAuthUser(perfil, clerkId);
}

async function getUserFromRequest(req) {
  const token = extractBearerToken(req);
  const user = await getUserFromToken(token);
  return { token, user };
}

module.exports = {
  extractBearerToken,
  getUserFromToken,
  getUserFromRequest,
};
