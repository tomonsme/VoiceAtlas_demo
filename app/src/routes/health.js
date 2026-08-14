const express = require("express");
const { pool } = require("../db");

const router = express.Router();

router.get("/api/health", async (_req, res, next) => {
  try {
    await pool.query("select 1");
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
