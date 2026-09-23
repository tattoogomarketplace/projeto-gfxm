const MIGRATION_MESSAGE =
  "Fase 1: autenticacao Supabase desativada. Clerk entra na Fase 2.";

function authUnavailable(status = 503) {
  const error = new Error(MIGRATION_MESSAGE);
  error.status = status;
  error.code = "CLERK_MIGRATION_PENDING";
  return error;
}

function extractBearerToken(req) {
  const authHeader = req.headers.authorization || "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

function createAuthClient() {
  throw authUnavailable();
}

async function getUserFromToken() {
  return null;
}

async function signUp() {
  return { data: { user: null }, error: authUnavailable(501) };
}

async function signInWithPassword() {
  return { data: { session: null }, error: authUnavailable(501) };
}

async function sendOtp() {
  return { data: null, error: authUnavailable(501) };
}

async function verifyOtp() {
  return { data: { user: null, session: null }, error: authUnavailable(501) };
}

function getStorageClient() {
  throw authUnavailable();
}

module.exports = {
  createAuthClient,
  extractBearerToken,
  getUserFromToken,
  signUp,
  signInWithPassword,
  sendOtp,
  verifyOtp,
  getStorageClient,
};
