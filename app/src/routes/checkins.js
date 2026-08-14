const express = require("express");
const { pool } = require("../db");
const { requireLevel, optionalLevel } = require("../http");
const { requireSession } = require("../auth");
const { getCheckinBoard, requireWindow } = require("../services/checkins");

const router = express.Router();

router.get("/api/checkins", requireSession, async (req, res, next) => {
  try {
    return res.json({ board: await getCheckinBoard(req.user.id, requireWindow(req.query.days)) });
  } catch (error) {
    return next(error);
  }
});

router.post("/api/checkins", requireSession, async (req, res, next) => {
  try {
    const body = req.body || {};
    const conditionLevel = requireLevel(body.conditionLevel, "Condition level");
    const fatigueLevel = optionalLevel(body.fatigueLevel, "Fatigue level");
    const sleepLevel = optionalLevel(body.sleepLevel, "Sleep level");
    const pem = Boolean(body.pem);
    const note = String(body.note || "").trim().slice(0, 200) || null;

    // The date comes from the server: a client-supplied day would let anyone
    // backfill an arbitrary history into what is meant to be a daily record.
    await pool.query(
      `insert into daily_checkins
        (user_id, recorded_on, condition_level, fatigue_level, sleep_level, post_exertional_malaise, note)
       values ($1, current_date, $2, $3, $4, $5, $6)
       on conflict (user_id, recorded_on)
       do update set condition_level = excluded.condition_level,
                     fatigue_level = excluded.fatigue_level,
                     sleep_level = excluded.sleep_level,
                     post_exertional_malaise = excluded.post_exertional_malaise,
                     note = excluded.note,
                     updated_at = now()`,
      [req.user.id, conditionLevel, fatigueLevel, sleepLevel, pem, note]
    );

    return res.status(201).json({ board: await getCheckinBoard(req.user.id, requireWindow(body.days)) });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
