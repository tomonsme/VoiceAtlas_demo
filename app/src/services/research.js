const { pool } = require("../db");
const research = require("../domain/research");
const { demoControlsEnabled } = require("../config");

const studyStatusLabels = { recruiting: "募集中", active: "実施中", closed: "終了" };

async function getResearchStudies(userId) {
  const result = await pool.query(
    `select rs.id,
            rs.title,
            rs.summary,
            rs.institution,
            rs.target_summary,
            rs.status,
            re.status as enrollment_status,
            re.enrolled_at,
            sp.status as specimen_status,
            (select count(*) from specimen_events e where e.specimen_id = sp.id) as event_count
       from research_studies rs
       left join research_enrollments re on re.study_id = rs.id and re.user_id = $1
       left join specimens sp on sp.enrollment_id = re.id
      order by (re.status is null), rs.created_at`,
    [userId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    summary: row.summary,
    institution: row.institution,
    targetSummary: row.target_summary,
    status: row.status,
    statusLabel: studyStatusLabels[row.status] || row.status,
    enrollmentStatus: row.enrollment_status,
    enrolledAt: row.enrolled_at,
    specimenStatus: row.specimen_status,
    specimenDone: row.specimen_status
      ? research.specimenSteps.findIndex((step) => step.status === row.specimen_status) + 1
      : 0,
    specimenTotal: research.specimenSteps.length
  }));
}

async function getResearchOverview(userId, studyId = null) {
  const enrollment = await pool.query(
    `select re.id as enrollment_id,
            re.status,
            re.participant_code,
            re.enrolled_at,
            re.verified_at,
            re.withdrawn_at,
            rs.id as study_id,
            rs.title,
            rs.summary,
            rs.data_lock_at,
            rs.withdrawal_policy_note,
            sp.id as specimen_id,
            sp.specimen_code,
            sp.specimen_type,
            sp.status as specimen_status,
            sp.analysis_scheduled_at,
            rs.status as study_status,
            rs.institution,
            rs.target_summary
       from research_studies rs
       left join research_enrollments re on re.study_id = rs.id and re.user_id = $1
       left join specimens sp on sp.enrollment_id = re.id
      where ($2::uuid is null or rs.id = $2::uuid)
        and ($2::uuid is not null or re.id is not null)
      order by re.enrolled_at desc nulls last, rs.created_at
      limit 1`,
    [userId, studyId]
  );

  if (!enrollment.rowCount) return null;
  const row = enrollment.rows[0];

  const events = row.specimen_id
    ? (
        await pool.query(
          `select status, occurred_at, location, note
             from specimen_events
            where specimen_id = $1
            order by occurred_at`,
          [row.specimen_id]
        )
      ).rows.map((event) => ({
        status: event.status,
        occurredAt: event.occurred_at,
        location: event.location,
        note: event.note
      }))
    : [];

  const dataUses = await pool.query(
    `select purpose, detail, data_items, recipient, retention, withdrawable, applies_from
       from study_data_uses
      where study_id = $1
      order by sort_order, purpose`,
    [row.study_id]
  );

  return {
    study: {
      id: row.study_id,
      title: row.title,
      summary: row.summary,
      institution: row.institution,
      targetSummary: row.target_summary,
      status: row.study_status,
      statusLabel: studyStatusLabels[row.study_status] || row.study_status
    },
    enrollment: row.enrollment_id
      ? {
          status: row.status,
          participantCode: row.participant_code,
          enrolledAt: row.enrolled_at,
          verifiedAt: row.verified_at,
          withdrawnAt: row.withdrawn_at
        }
      : null,
    specimen: row.specimen_id
      ? {
          code: row.specimen_code,
          type: row.specimen_type,
          typeLabel: research.specimenTypeLabels[row.specimen_type] || row.specimen_type,
          status: row.specimen_status,
          steps: research.buildTimeline(row.specimen_status, events),
          canAdvance: demoControlsEnabled && Boolean(research.nextStatus(row.specimen_status))
        }
      : null,
    dataUses: dataUses.rows.map((use) => ({
      purpose: use.purpose,
      detail: use.detail,
      dataItems: use.data_items,
      recipient: use.recipient,
      retention: use.retention,
      withdrawable: use.withdrawable,
      appliesFrom: use.applies_from
    })),
    withdrawal: !row.enrollment_id
      ? null
      : research.withdrawalState({
      events,
      analysisScheduledAt: row.analysis_scheduled_at,
      dataLockAt: row.data_lock_at,
          policyNote: row.withdrawal_policy_note,
          withdrawnAt: row.withdrawn_at
        })
  };
}

module.exports = { studyStatusLabels, getResearchStudies, getResearchOverview };
