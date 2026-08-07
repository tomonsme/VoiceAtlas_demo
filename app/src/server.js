const crypto = require("crypto");
const express = require("express");
const path = require("path");
const { pool, waitForDb } = require("./db");

const app = express();
const publicDir = path.join(__dirname, "..", "public");
const assetsDir = path.join(__dirname, "assets");

const basicAuthEnabled = process.env.BASIC_AUTH_ENABLED !== "false";
const basicAuthUsername = process.env.BASIC_AUTH_USERNAME || "";
const basicAuthPassword = process.env.BASIC_AUTH_PASSWORD || "";
const basicAuthRealm = process.env.BASIC_AUTH_REALM || "VoiceAtlas Test";

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

function requireBasicAuth(req, res, next) {
  if (!basicAuthEnabled) return next();

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

app.use(requireBasicAuth);
app.use(express.json({ limit: "1mb" }));
app.use(express.static(publicDir));
app.use("/assets", express.static(assetsDir));

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

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function requireUuid(value, label) {
  const id = String(value || "").trim();
  if (!isUuid(id)) {
    const error = new Error(`${label} must be a valid UUID`);
    error.status = 400;
    throw error;
  }
  return id;
}

async function getLatestConsent(client, type) {
  const result = await client.query(
    `select id
       from consent_documents
      where document_type = $1
        and retired_at is null
      order by effective_at desc
      limit 1`,
    [type]
  );

  if (!result.rowCount) {
    const error = new Error(`Consent document not found: ${type}`);
    error.status = 500;
    throw error;
  }

  return result.rows[0].id;
}

async function getDiseaseId(client, name) {
  const existing = await client.query("select id from diseases where name = $1", [name]);
  if (existing.rowCount) return existing.rows[0].id;

  const created = await client.query(
    "insert into diseases (name, category) values ($1, 'user_defined') returning id",
    [name]
  );
  return created.rows[0].id;
}

async function getProfile(userId) {
  const profile = await pool.query(
    `select u.id,
            u.nickname,
            coalesce(ud.age_range, '') as age_range,
            coalesce(ud.gender, '') as gender,
            coalesce(d.name, '') as disease,
            coalesce(uc.condition_status_text, '') as condition_status_text,
            exists (
              select 1
                from research_enrollments re
               where re.user_id = u.id
                 and re.status = 'verified'
            ) as research_verified
       from users u
       left join user_demographics ud on ud.user_id = u.id
       left join lateral (
         select *
           from user_conditions
          where user_id = u.id
          order by updated_at desc
          limit 1
       ) uc on true
       left join diseases d on d.id = uc.disease_id
      where u.id = $1
        and u.deleted_at is null`,
    [userId]
  );

  if (!profile.rowCount) return null;

  const badges = await pool.query(
    `select b.code, b.label, b.description, ub.granted_at
       from user_badges ub
       join badges b on b.id = ub.badge_id
      where ub.user_id = $1
        and ub.revoked_at is null
      order by ub.granted_at desc`,
    [userId]
  );

  const row = profile.rows[0];
  return {
    id: row.id,
    nickname: row.nickname,
    ageRange: row.age_range,
    gender: row.gender,
    disease: row.disease,
    conditionStatusText: row.condition_status_text,
    researchVerified: row.research_verified,
    badges: badges.rows
  };
}

app.get("/api/health", async (_req, res, next) => {
  try {
    await pool.query("select 1");
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/profile/:userId", async (req, res, next) => {
  try {
    const userId = requireUuid(req.params.userId, "User id");
    const profile = await getProfile(userId);
    if (!profile) return res.status(404).json({ error: "profile_not_found" });
    return res.json({ profile });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/search/summary", async (_req, res, next) => {
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

app.post("/api/light-registration", async (req, res, next) => {
  const client = await pool.connect();
  try {
    const body = req.body || {};
    if (!body.termsAccepted) {
      return res.status(400).json({ error: "terms_required" });
    }

    const userId = body.userId ? requireUuid(body.userId, "User id") : crypto.randomUUID();
    const nickname = requireText(body, "nickname", "Nickname").slice(0, 80);
    const diseaseName = requireText(body, "disease", "Disease").slice(0, 120);
    const conditionStatusText = requireText(body, "conditionStatusText", "Condition status").slice(0, 1200);
    const ageRange = String(body.ageRange || "").trim().slice(0, 40);
    const gender = String(body.gender || "").trim().slice(0, 40);

    await client.query("begin");

    await client.query(
      `insert into users (id, nickname, last_seen_at)
       values ($1, $2, now())
       on conflict (id)
       do update set nickname = excluded.nickname, last_seen_at = now()`,
      [userId, nickname]
    );

    const termsDocumentId = await getLatestConsent(client, "terms");
    await client.query(
      `insert into user_consents (user_id, document_id, ip_hash, user_agent_hash)
       values ($1, $2, $3, $4)`,
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

    await client.query("commit");
    const profile = await getProfile(userId);
    return res.status(201).json({ profile });
  } catch (error) {
    await client.query("rollback");
    return next(error);
  } finally {
    client.release();
  }
});

app.post("/api/research/enroll", async (req, res, next) => {
  const client = await pool.connect();
  try {
    const body = req.body || {};
    if (!body.researchConsentAccepted) {
      return res.status(400).json({ error: "research_consent_required" });
    }

    const userId = requireUuid(body.userId, "User id");
    const legalName = requireText(body, "legalName", "Legal name").slice(0, 160);
    const postalCode = requireText(body, "postalCode", "Postal code").slice(0, 20);
    const prefecture = requireText(body, "prefecture", "Prefecture").slice(0, 80);
    const city = requireText(body, "city", "City").slice(0, 120);
    const addressLine1 = requireText(body, "addressLine1", "Address").slice(0, 240);
    const addressLine2 = String(body.addressLine2 || "").trim().slice(0, 240);

    await client.query("begin");

    const user = await client.query("select id from users where id = $1 and deleted_at is null", [userId]);
    if (!user.rowCount) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    const study = await client.query(
      `select id
         from research_studies
        where status = 'active'
        order by created_at desc
        limit 1`
    );
    if (!study.rowCount) {
      const error = new Error("Active study not found");
      error.status = 500;
      throw error;
    }

    const researchDocumentId = await getLatestConsent(client, "research_participation");
    await client.query(
      `insert into user_consents (user_id, document_id, ip_hash, user_agent_hash)
       values ($1, $2, $3, $4)`,
      [userId, researchDocumentId, sha256(req.ip), sha256(req.get("user-agent"))]
    );

    const enrollment = await client.query(
      `insert into research_enrollments
        (study_id, user_id, status, participant_code, enrolled_at, verified_at)
       values ($1, $2, 'verified', $3, now(), now())
       on conflict (study_id, user_id)
       do update set status = 'verified',
                     verified_at = now(),
                     withdrawn_at = null
       returning id`,
      [study.rows[0].id, userId, `VA-${crypto.randomBytes(4).toString("hex").toUpperCase()}`]
    );
    const enrollmentId = enrollment.rows[0].id;

    await client.query(
      `insert into research_identity_profiles
        (enrollment_id, legal_name, postal_code, prefecture, city, address_line1, address_line2, encrypted_at)
       values ($1, $2, $3, $4, $5, $6, $7, now())
       on conflict (enrollment_id)
       do update set legal_name = excluded.legal_name,
                     postal_code = excluded.postal_code,
                     prefecture = excluded.prefecture,
                     city = excluded.city,
                     address_line1 = excluded.address_line1,
                     address_line2 = excluded.address_line2,
                     encrypted_at = now()`,
      [enrollmentId, legalName, postalCode, prefecture, city, addressLine1, addressLine2]
    );

    const badge = await client.query("select id from badges where code = 'research_verified'");
    if (badge.rowCount) {
      await client.query(
        `insert into user_badges (user_id, badge_id, source_type, source_id)
         select $1, $2, 'research_enrollment', $3
          where not exists (
            select 1
              from user_badges
             where user_id = $1
               and badge_id = $2
               and source_type = 'research_enrollment'
               and source_id = $3
               and revoked_at is null
          )`,
        [userId, badge.rows[0].id, enrollmentId]
      );
    }

    await client.query(
      `insert into audit_logs (actor_id, action, entity_type, entity_id)
       values ($1, 'research_enrollment_verified', 'research_enrollments', $2)`,
      [userId, enrollmentId]
    );

    await client.query("commit");
    const profile = await getProfile(userId);
    return res.status(201).json({ profile });
  } catch (error) {
    await client.query("rollback");
    return next(error);
  } finally {
    client.release();
  }
});

app.post("/api/research/withdraw", async (req, res, next) => {
  const client = await pool.connect();
  try {
    const body = req.body || {};
    const userId = requireUuid(body.userId, "User id");

    await client.query("begin");

    const user = await client.query("select id from users where id = $1 and deleted_at is null", [userId]);
    if (!user.rowCount) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    const withdrawn = await client.query(
      `update research_enrollments
          set status = 'withdrawn',
              withdrawn_at = now()
        where user_id = $1
          and status = 'verified'
        returning id`,
      [userId]
    );

    await client.query(
      `update user_badges
          set revoked_at = now()
        where user_id = $1
          and revoked_at is null
          and source_type = 'research_enrollment'
          and source_id = any($2::uuid[])`,
      [userId, withdrawn.rows.map((row) => row.id)]
    );

    await client.query(
      `update user_consents uc
          set withdrawn_at = now()
         from consent_documents cd
        where uc.document_id = cd.id
          and uc.user_id = $1
          and uc.withdrawn_at is null
          and cd.document_type = 'research_participation'`,
      [userId]
    );

    await client.query(
      `insert into audit_logs (actor_id, action, entity_type, entity_id)
       values ($1, 'research_consent_withdrawn', 'users', $1)`,
      [userId]
    );

    await client.query("commit");
    const profile = await getProfile(userId);
    return res.json({ profile });
  } catch (error) {
    await client.query("rollback");
    return next(error);
  } finally {
    client.release();
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  res.status(status).json({
    error: status >= 500 ? "server_error" : "request_error",
    message: error.message
  });
});

waitForDb()
  .then(() => {
    const port = Number(process.env.PORT || 3000);
    app.listen(port, () => {
      console.log(`VoiceAtlas app listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Database connection failed", error);
    process.exit(1);
  });
