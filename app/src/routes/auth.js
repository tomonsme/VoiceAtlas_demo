const express = require("express");
const { pool, withTransaction } = require("../db");
const { fail, requireEmail, requireText } = require("../http");
const { createSession, setSessionCookie, sessionCookieOptions, requireSession } = require("../auth");
const { sessionCookieName } = require("../config");
const { getProfile } = require("../services/profile");

const router = express.Router();

router.post("/api/auth/signup", async (req, res, next) => {
  try {
    const body = req.body || {};
    const email = requireEmail(body.email);
    // Mock only: a password is required so the screen behaves like the real one,
    // but it is never stored or checked. Cognito owns credentials in production.
    requireText(body, "password", "Password");

    const { userId, token } = await withTransaction(async (client) => {
      const existing = await client.query(
        "select id from users where lower(email) = lower($1) and deleted_at is null",
        [email]
      );
      if (existing.rowCount) throw fail(409, "email_taken", "Email is already registered");

      const created = await client.query(
        `insert into users (nickname, email, last_seen_at)
         values ($1, $2, now())
         returning id`,
        [email.split("@")[0].slice(0, 80), email]
      );
      const newUserId = created.rows[0].id;

      await client.query(
        `insert into audit_logs (actor_id, action, entity_type, entity_id)
         values ($1, 'account_created', 'users', $1)`,
        [newUserId]
      );

      return { userId: newUserId, token: await createSession(client, newUserId) };
    });

    setSessionCookie(req, res, token);
    return res.status(201).json({ profile: await getProfile(userId) });
  } catch (error) {
    return next(error);
  }
});

router.post("/api/auth/login", async (req, res, next) => {
  try {
    const body = req.body || {};
    const email = requireEmail(body.email);
    requireText(body, "password", "Password");

    const user = await pool.query(
      "select id from users where lower(email) = lower($1) and deleted_at is null",
      [email]
    );
    if (!user.rowCount) throw fail(401, "login_failed", "Account not found");
    const userId = user.rows[0].id;

    const token = await withTransaction(async (client) => {
      const created = await createSession(client, userId);
      await client.query("update users set last_seen_at = now() where id = $1", [userId]);
      await client.query(
        `insert into audit_logs (actor_id, action, entity_type, entity_id)
         values ($1, 'login', 'users', $1)`,
        [userId]
      );
      return created;
    });

    setSessionCookie(req, res, token);
    return res.json({ profile: await getProfile(userId) });
  } catch (error) {
    return next(error);
  }
});

router.post("/api/auth/logout", async (req, res, next) => {
  try {
    if (req.user) {
      await pool.query("update user_sessions set revoked_at = now() where id = $1", [req.user.sessionId]);
    }
    res.clearCookie(sessionCookieName, sessionCookieOptions(req));
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

router.get("/api/me", requireSession, async (req, res, next) => {
  try {
    const profile = await getProfile(req.user.id);
    if (!profile) return res.status(404).json({ error: "profile_not_found" });
    return res.json({ profile });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
