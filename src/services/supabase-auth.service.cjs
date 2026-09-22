const { createClient } = require("@supabase/supabase-js");
const { supabaseUrl, supabaseAnonKey } = require("../config/env.cjs");

function createAuthClient(accessToken) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    ...(accessToken ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } } : {}),
  });
}

function extractBearerToken(req) {
  const authHeader = req.headers.authorization || "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

async function getUserFromToken(token) {
  const { data, error } = await createAuthClient(token).auth.getUser(token || undefined);
  if (error || !data?.user) return null;
  return data.user;
}

async function signUp({ email, password, role, full_name, accepted_terms }) {
  return createAuthClient().auth.signUp({
    email,
    password,
    options: {
      data: {
        role,
        full_name,
        nome: full_name,
        accepted_terms: Boolean(accepted_terms),
      },
    },
  });
}

async function signInWithPassword({ email, password }) {
  return createAuthClient().auth.signInWithPassword({ email, password });
}

async function sendOtp(email) {
  return createAuthClient().auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
    },
  });
}

async function verifyOtp({ email, token }) {
  return createAuthClient().auth.verifyOtp({
    email,
    token,
    type: "email",
  });
}

function getStorageClient(accessToken) {
  return createAuthClient(accessToken);
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
