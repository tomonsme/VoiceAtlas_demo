const crypto = require("crypto");

function sha256(value) {
  if (!value) return null;
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function requireText(body, key, label) {
  const value = String(body[key] || "").trim();
  if (!value) {
    const error = new Error(`${label} is required`);
    error.status = 400;
    throw error;
  }
  return value;
}

function fail(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function requireEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw fail(400, "invalid_email", "Email is invalid");
  }
  return email;
}

function requireUuidish(value) {
  const id = String(value || "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw fail(400, "invalid_study", "studyId must be a UUID");
  }
  return id;
}

function requireLevel(value, label) {
  const level = Number(value);
  if (!Number.isInteger(level) || level < 1 || level > 5) {
    throw fail(400, "invalid_level", `${label} must be an integer from 1 to 5`);
  }
  return level;
}

function optionalLevel(value, label) {
  if (value === null || value === undefined || value === "") return null;
  return requireLevel(value, label);
}

module.exports = { sha256, requireText, fail, requireEmail, requireUuidish, requireLevel, optionalLevel };
