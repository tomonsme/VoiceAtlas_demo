const { Pool } = require("pg");

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.POSTGRES_HOST || "localhost",
        port: Number(process.env.POSTGRES_PORT || 5432),
        database: process.env.POSTGRES_DB || "voiceatlas",
        user: process.env.POSTGRES_USER || "voiceatlas",
        password: process.env.POSTGRES_PASSWORD || "voiceatlas_password"
      }
);

async function waitForDb(retries = 40) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await pool.query("select 1");
      return;
    } catch (error) {
      if (attempt === retries) throw error;
      await new Promise((resolve) => setTimeout(resolve, 750));
    }
  }
}

module.exports = { pool, waitForDb };

