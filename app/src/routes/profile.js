const express = require("express");
const { pool, withTransaction } = require("../db");
const { sha256, requireText } = require("../http");
const { requireSession } = require("../auth");
const { getLatestConsent, getDiseaseId, getProfile } = require("../services/profile");

const router = express.Router();

router.get("/api/consents", requireSession, async (req, res, next) => {
  try {
    const result = await pool.query(
      `select cd.document_type, cd.version, cd.title, uc.accepted_at, uc.withdrawn_at
         from user_consents uc
         join consent_documents cd on cd.id = uc.document_id
        where uc.user_id = $1
        order by uc.accepted_at desc`,
      [req.user.id]
    );

    return res.json({
      consents: result.rows.map((row) => ({
        documentType: row.document_type,
        version: row.version,
        title: row.title,
        acceptedAt: row.accepted_at,
        withdrawnAt: row.withdrawn_at
      }))
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/api/search/summary", requireSession, async (_req, res, next) => {
  try {
    const result = await pool.query(
      `select count(*)::int as total_users
         from users
        where deleted_at is null`
    );
    return res.json({ totalUsers: result.rows[0].total_users });
  } catch (error) {
    return next(error);
  }
});

router.post("/api/light-registration", requireSession, async (req, res, next) => {
  try {
    const body = req.body || {};
    if (!body.termsAccepted) {
      return res.status(400).json({ error: "terms_required" });
    }

    const userId = req.user.id;
    const nickname = requireText(body, "nickname", "Nickname").slice(0, 80);
    const diseaseName = requireText(body, "disease", "Disease").slice(0, 120);
    const conditionStatusText = requireText(body, "conditionStatusText", "Condition status").slice(0, 1200);
    const ageRange = String(body.ageRange || "").trim().slice(0, 40);
    const gender = String(body.gender || "").trim().slice(0, 40);

    await withTransaction(async (client) => {
      await client.query(
        "update users set nickname = $2, last_seen_at = now() where id = $1",
        [userId, nickname]
      );

      const termsDocumentId = await getLatestConsent(client, "terms");
      // One consent record per document version: re-running registration must not
      // fabricate a second acceptance of the same document.
      await client.query(
        `insert into user_consents (user_id, document_id, ip_hash, user_agent_hash)
         select $1, $2, $3, $4
          where not exists (
            select 1 from user_consents
             where user_id = $1 and document_id = $2 and withdrawn_at is null
          )`,
        [userId, termsDocumentId, sha256(req.ip), sha256(req.get("user-agent"))]
      );

      const diseaseId = await getDiseaseId(client, diseaseName);

      await client.query(
        `insert into user_conditions (user_id, disease_id, condition_status_text, visibility)
         values ($1, $2, $3, 'members')`,
        [userId, diseaseId, conditionStatusText]
      );

      await client.query(
        `insert into user_demographics (user_id, age_range, gender, visibility)
         values ($1, $2, $3, 'members')
         on conflict (user_id)
         do update set age_range = excluded.age_range,
                       gender = excluded.gender,
                       visibility = excluded.visibility`,
        [userId, ageRange, gender]
      );

      await client.query(
        `insert into user_privacy_settings (user_id)
         values ($1)
         on conflict (user_id) do nothing`,
        [userId]
      );

      await client.query(
        `insert into social_profiles (user_id, display_name, bio)
         values ($1, $2, $3)
         on conflict (user_id)
         do update set display_name = excluded.display_name,
                       bio = excluded.bio,
                       updated_at = now()`,
        [userId, nickname, conditionStatusText]
      );

      await client.query(
        `insert into audit_logs (actor_id, action, entity_type, entity_id)
         values ($1, 'light_registration_upsert', 'users', $1)`,
        [userId]
      );
    });

    const profile = await getProfile(userId);
    return res.status(201).json({ profile });
  } catch (error) {
    return next(error);
  }
});

router.put("/api/profile", requireSession, async (req, res, next) => {
  try {
    const body = req.body || {};
    const userId = req.user.id;
    const nickname = requireText(body, "nickname", "Nickname").slice(0, 80);
    const diseaseName = requireText(body, "disease", "Disease").slice(0, 120);
    const conditionStatusText = requireText(body, "conditionStatusText", "Condition status").slice(0, 1200);
    const ageRange = String(body.ageRange || "").trim().slice(0, 40);
    const gender = String(body.gender || "").trim().slice(0, 40);

    await withTransaction(async (client) => {
      await client.query(
        "update users set nickname = $2, last_seen_at = now() where id = $1",
        [userId, nickname]
      );

      const diseaseId = await getDiseaseId(client, diseaseName);

      // user_conditions is append-only by design: each edit keeps the previous
      // state, so the condition history stays auditable.
      await client.query(
        `insert into user_conditions (user_id, disease_id, condition_status_text, visibility)
         values ($1, $2, $3, 'members')`,
        [userId, diseaseId, conditionStatusText]
      );

      await client.query(
        `insert into user_demographics (user_id, age_range, gender, visibility)
         values ($1, $2, $3, 'members')
         on conflict (user_id)
         do update set age_range = excluded.age_range,
                       gender = excluded.gender,
                       visibility = excluded.visibility`,
        [userId, ageRange, gender]
      );

      await client.query(
        `insert into social_profiles (user_id, display_name, bio)
         values ($1, $2, $3)
         on conflict (user_id)
         do update set display_name = excluded.display_name,
                       bio = excluded.bio,
                       updated_at = now()`,
        [userId, nickname, conditionStatusText]
      );

      await client.query(
        `insert into audit_logs (actor_id, action, entity_type, entity_id)
         values ($1, 'profile_updated', 'users', $1)`,
        [userId]
      );
    });

    return res.json({ profile: await getProfile(userId) });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
