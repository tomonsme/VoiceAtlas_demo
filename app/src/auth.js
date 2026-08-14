const crypto = require("crypto");
const { pool } = require("./db");
const { log } = require("./log");
const { sha256 } = require("./http");
const {
  basicAuthEnabled,
  basicAuthUsername,
  basicAuthPassword,
  basicAuthRealm,
  sessionCookieName,
  sessionTtlDays
} = require("./config");

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function requestBasicAuth(res) {
  const realm = basicAuthRealm.replace(/["\\]/g, "");
  res.set("WWW-Authenticate", `Basic realm="${realm}", charset="UTF-8"`);
  return res.status(401).send("Authentication required");
}

const loopbackHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

// Whether the request came straight from this machine. Read from the raw Host
// header rather than req.hostname, which honours X-Forwarded-Host and would
// therefore trust the very proxy we are trying to detect.
function isLoopbackRequest(req) {
  if (req.headers["x-forwarded-for"] || req.headers["cf-connecting-ip"]) return false;
  const host = String(req.headers.host || "").toLowerCase();
  const name = host.startsWith("[") ? host.slice(0, host.indexOf("]") + 1) : host.split(":")[0];
  return loopbackHosts.has(name);
}

function requireBasicAuth(req, res, next) {
  if (!basicAuthEnabled) {
    // Turning the gate off is only safe for local access. Anything arriving
    // through a proxy -- the Cloudflare tunnel above all -- is refused instead,
    // so an unauthenticated public deployment cannot happen by accident.
    if (isLoopbackRequest(req)) return next();
    log("warn", { event: "remote_access_refused", requestId: req.id, host: req.headers.host });
    return res
      .status(503)
      .send("Remote access is refused while BASIC_AUTH_ENABLED=false. Set it to true in .env.");
  }

  if (!basicAuthUsername || !basicAuthPassword) {
    return res.status(503).send("Basic auth is not configured");
  }

  const authorization = req.get("authorization") || "";
  const [scheme, credentials] = authorization.split(" ");
  if (scheme !== "Basic" || !credentials) return requestBasicAuth(res);

  let decoded = "";
  try {
    decoded = Buffer.from(credentials, "base64").toString("utf8");
  } catch (_error) {
    return requestBasicAuth(res);
  }

  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex < 0) return requestBasicAuth(res);

  const username = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);

  if (safeEqual(username, basicAuthUsername) && safeEqual(password, basicAuthPassword)) {
    return next();
  }

  return requestBasicAuth(res);
}

/* ------------------------------------------------------------------ *
 * Sessions
 *
 * The mock keeps its own cookie session so the walkthrough can show a
 * real login/logout. In production Amazon Cognito issues the tokens and
 * this layer is replaced -- but the shape stays: handlers read the user
 * id from the session, never from the request body, so a signed-in user
 * cannot act on someone else's account by changing a parameter.
 * ------------------------------------------------------------------ */

function parseCookies(header) {
  const jar = {};
  for (const part of String(header || "").split(";")) {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex < 0) continue;
    const name = part.slice(0, separatorIndex).trim();
    if (!name) continue;
    const raw = part.slice(separatorIndex + 1).trim();
    try {
      jar[name] = decodeURIComponent(raw);
    } catch (_error) {
      jar[name] = raw;
    }
  }
  return jar;
}

async function createSession(client, userId) {
  const token = crypto.randomBytes(32).toString("hex");
  await client.query(
    `insert into user_sessions (user_id, token_hash, expires_at)
     values ($1, $2, now() + make_interval(days => $3))`,
    [userId, sha256(token), sessionTtlDays]
  );
  return token;
}

function sessionCookieOptions(req) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: req.secure,
    path: "/"
  };
}

function setSessionCookie(req, res, token) {
  res.cookie(sessionCookieName, token, {
    ...sessionCookieOptions(req),
    maxAge: sessionTtlDays * 24 * 60 * 60 * 1000
  });
}

async function loadSession(req, _res, next) {
  req.user = null;
  const token = parseCookies(req.headers.cookie)[sessionCookieName];
  if (!token) return next();

  try {
    const result = await pool.query(
      `select s.id as session_id, u.id as user_id
         from user_sessions s
         join users u on u.id = s.user_id
        where s.token_hash = $1
          and s.revoked_at is null
          and s.expires_at > now()
          and u.deleted_at is null`,
      [sha256(token)]
    );
    if (result.rowCount) {
      req.user = { id: result.rows[0].user_id, sessionId: result.rows[0].session_id };
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireSession(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "not_authenticated" });
  return next();
}

module.exports = {
  requireBasicAuth,
  createSession,
  sessionCookieOptions,
  setSessionCookie,
  loadSession,
  requireSession
};
