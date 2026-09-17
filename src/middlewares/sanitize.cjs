const SKIP_STRING_KEYS = new Set(["imagem_base64", "password", "token", "otp", "authorization"]);

function sanitizeValue(value, depth, parentKey) {
  if (depth > 20 || value == null) return value;

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1, parentKey));
  }

  if (typeof value === "object") {
    const clean = Object.create(null);
    for (const [key, nested] of Object.entries(value)) {
      if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
      if (key.startsWith("$")) continue;
      if (key.includes(".")) continue;
      clean[key] = sanitizeValue(nested, depth + 1, key);
    }
    return clean;
  }

  if (typeof value === "string") {
    if (SKIP_STRING_KEYS.has(parentKey)) return value.replace(/\0/g, "");
    return value.replace(/\0/g, "");
  }

  return value;
}

function replaceObject(target, cleaned) {
  if (!target || typeof target !== "object") return;
  for (const key of Object.keys(target)) {
    delete target[key];
  }
  Object.assign(target, cleaned);
}

function sanitizeRequest(req, _res, next) {
  if (req.body && typeof req.body === "object") {
    replaceObject(req.body, sanitizeValue(req.body, 0, ""));
  }
  if (req.query && typeof req.query === "object") {
    replaceObject(req.query, sanitizeValue(req.query, 0, ""));
  }
  if (req.params && typeof req.params === "object") {
    replaceObject(req.params, sanitizeValue(req.params, 0, ""));
  }
  next();
}

module.exports = { sanitizeRequest };
