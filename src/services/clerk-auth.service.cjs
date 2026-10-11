const { prisma } = require("./prisma.service.cjs");

function extractBearerToken(req) {
  const authHeader = req.headers.authorization || "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

async function getUserFromToken(token) {
  if (!token) return null;

  try {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) return null;

    const { verifyToken } = require("@clerk/backend");
    const payload = await verifyToken(token, { secretKey });
    const clerkId = payload && payload.sub;
    if (!clerkId) return null;

    const perfil = await prisma.perfil.findFirst({
      where: { clerk_id: clerkId },
      select: { id: true, email: true, role: true },
    });
    if (!perfil) return null;

    return {
      id: perfil.id,
      email: perfil.email,
      role: perfil.role,
    };
  } catch {
    return null;
  }
}

module.exports = {
  extractBearerToken,
  getUserFromToken,
};
