const { pool } = require("../db");

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
            coalesce(u.email, '') as email,
            coalesce(ud.age_range, '') as age_range,
            coalesce(ud.gender, '') as gender,
            coalesce(d.name, '') as disease,
            coalesce(uc.condition_status_text, '') as condition_status_text,
            uc.id is not null as registered,
            exists (
              select 1
                from user_consents c
                join consent_documents cd on cd.id = c.document_id
               where c.user_id = u.id
                 and cd.document_type = 'terms'
                 and c.withdrawn_at is null
            ) as terms_accepted,
            exists (
              select 1
                from research_enrollments re
               where re.user_id = u.id
                 and re.status = 'verified'
            ) as research_verified,
            exists (
              select 1
                from research_enrollments re
               where re.user_id = u.id
            ) as research_enrolled
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
    email: row.email,
    nickname: row.nickname,
    ageRange: row.age_range,
    gender: row.gender,
    disease: row.disease,
    conditionStatusText: row.condition_status_text,
    registered: row.registered,
    termsAccepted: row.terms_accepted,
    researchVerified: row.research_verified,
    researchEnrolled: row.research_enrolled,
    badges: badges.rows
  };
}

module.exports = { getLatestConsent, getDiseaseId, getProfile };
