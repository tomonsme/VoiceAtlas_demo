const crypto = require("crypto");
const express = require("express");
const { withTransaction } = require("../db");
const { fail, sha256, requireText, requireUuidish } = require("../http");
const { requireSession } = require("../auth");
const { demoControlsEnabled } = require("../config");
const research = require("../domain/research");
const { getResearchStudies, getResearchOverview } = require("../services/research");
const { getLatestConsent, getProfile } = require("../services/profile");

const router = express.Router();

router.get("/api/research/studies", requireSession, async (req, res, next) => {
  try {
    return res.json({ studies: await getResearchStudies(req.user.id) });
  } catch (error) {
    return next(error);
  }
});

router.get("/api/research/overview", requireSession, async (req, res, next) => {
  try {
    const studyId = req.query.studyId ? requireUuidish(req.query.studyId) : null;
    const overview = await getResearchOverview(req.user.id, studyId);
    if (!overview) return res.status(404).json({ error: "enrollment_not_found" });
    return res.json({ overview });
  } catch (error) {
    return next(error);
  }
});

// Demo control: production advances a specimen from the laboratory's systems,
// never from the participant's session.
router.post("/api/research/specimen/advance", requireSession, async (req, res, next) => {
  try {
    if (!demoControlsEnabled) throw fail(404, "not_found", "Demo controls are disabled");

    await withTransaction(async (client) => {
      const specimen = await client.query(
        `select sp.id, sp.status
           from specimens sp
           join research_enrollments re on re.id = sp.enrollment_id
          where re.user_id = $1
          order by re.enrolled_at desc
          limit 1
          for update`,
        [req.user.id]
      );
      if (!specimen.rowCount) throw fail(404, "specimen_not_found", "Specimen not found");

      const nextStatus = research.nextStatus(specimen.rows[0].status);
      if (!nextStatus) throw fail(409, "specimen_final_stage", "Specimen is already at its final stage");

      const step = research.specimenSteps.find((item) => item.status === nextStatus);
      await client.query("update specimens set status = $2, updated_at = now() where id = $1", [
        specimen.rows[0].id,
        nextStatus
      ]);
      await client.query(
        `insert into specimen_events (specimen_id, status, location, note)
         values ($1, $2, $3, $4)`,
        [specimen.rows[0].id, nextStatus, "デモ操作", step ? step.description : null]
      );
    });

    return res.json({ overview: await getResearchOverview(req.user.id) });
  } catch (error) {
    return next(error);
  }
});

router.post("/api/research/enroll", requireSession, async (req, res, next) => {
  try {
    const body = req.body || {};
    if (!body.researchConsentAccepted) {
      return res.status(400).json({ error: "research_consent_required" });
    }

    const userId = req.user.id;
    const legalName = requireText(body, "legalName", "Legal name").slice(0, 160);
    const postalCode = requireText(body, "postalCode", "Postal code").slice(0, 20);
    const prefecture = requireText(body, "prefecture", "Prefecture").slice(0, 80);
    const city = requireText(body, "city", "City").slice(0, 120);
    const addressLine1 = requireText(body, "addressLine1", "Address").slice(0, 240);
    const addressLine2 = String(body.addressLine2 || "").trim().slice(0, 240);
    const studyId = body.studyId ? requireUuidish(body.studyId) : null;

    await withTransaction(async (client) => {
      // The study is chosen on the study list, so enrolment names it explicitly
      // rather than guessing at whichever one happens to be open.
      const study = studyId
        ? await client.query(
            "select id from research_studies where id = $1 and status in ('recruiting', 'active')",
            [studyId]
          )
        : await client.query(
            `select id from research_studies where status in ('recruiting', 'active')
              order by created_at limit 1`
          );
      if (!study.rowCount) throw fail(404, "study_not_available", "Study is not open for enrolment");

      const researchDocumentId = await getLatestConsent(client, "research_participation");
      // A withdrawn consent stays in the history; re-joining records a new one.
      await client.query(
        `insert into user_consents (user_id, document_id, ip_hash, user_agent_hash)
         select $1, $2, $3, $4
          where not exists (
            select 1 from user_consents
             where user_id = $1 and document_id = $2 and withdrawn_at is null
          )`,
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

      // Enrolling starts the specimen pipeline: a collection kit goes out, and
      // the participant can follow it from the research page.
      const specimen = await client.query(
        `insert into specimens (enrollment_id, specimen_code, specimen_type, status, analysis_scheduled_at)
         values ($1, $2, 'blood', 'kit_shipped', now() + interval '21 days')
         on conflict (enrollment_id) do nothing
         returning id`,
        [enrollmentId, `VA-SPC-${crypto.randomBytes(4).toString("hex").toUpperCase()}`]
      );
      if (specimen.rowCount) {
        await client.query(
          `insert into specimen_events (specimen_id, status, location, note)
           values ($1, 'kit_shipped', '配送センター', '登録住所へ採取キットを発送しました')`,
          [specimen.rows[0].id]
        );
      }

      await client.query(
        `insert into audit_logs (actor_id, action, entity_type, entity_id)
         values ($1, 'research_enrollment_verified', 'research_enrollments', $2)`,
        [userId, enrollmentId]
      );
    });

    const profile = await getProfile(userId);
    return res.status(201).json({ profile });
  } catch (error) {
    return next(error);
  }
});

router.post("/api/research/withdraw", requireSession, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const studyId = (req.body || {}).studyId ? requireUuidish(req.body.studyId) : null;

    await withTransaction(async (client) => {
      const withdrawn = await client.query(
        `update research_enrollments
            set status = 'withdrawn',
                withdrawn_at = now()
          where user_id = $1
            and status = 'verified'
            and ($2::uuid is null or study_id = $2::uuid)
          returning id`,
        [userId, studyId]
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

      // Only when the last active enrolment is gone does the research consent
      // itself lapse; otherwise another study would lose its record too.
      await client.query(
        `update user_consents uc
            set withdrawn_at = now()
           from consent_documents cd
          where uc.document_id = cd.id
            and uc.user_id = $1
            and uc.withdrawn_at is null
            and cd.document_type = 'research_participation'
            and not exists (
              select 1 from research_enrollments
               where user_id = $1 and status = 'verified'
            )`,
        [userId]
      );

      // The specimen is destroyed on withdrawal. Results already derived from it
      // may remain: that is what the withdrawal deadlines on the research page
      // are telling the participant.
      const enrollmentIds = withdrawn.rows.map((row) => row.id);
      await client.query(
        `update specimens
            set status = 'disposed',
                updated_at = now()
          where enrollment_id = any($1::uuid[])
            and status <> 'disposed'`,
        [enrollmentIds]
      );
      await client.query(
        `insert into specimen_events (specimen_id, status, location, note)
         select sp.id, 'disposed', '検査機関', '同意撤回のため検体を破棄しました'
           from specimens sp
          where sp.enrollment_id = any($1::uuid[])
            and not exists (
              select 1 from specimen_events e
               where e.specimen_id = sp.id and e.status = 'disposed'
            )`,
        [enrollmentIds]
      );

      await client.query(
        `insert into audit_logs (actor_id, action, entity_type, entity_id)
         values ($1, 'research_consent_withdrawn', 'users', $1)`,
        [userId]
      );
    });

    const profile = await getProfile(userId);
    return res.json({ profile });
  } catch (error) {
    return next(error);
  }
});

// Unknown API paths must not fall through to the SPA shell: a client would get

module.exports = router;
