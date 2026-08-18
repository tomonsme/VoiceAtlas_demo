const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const { log } = require("./log");

if (!process.env.DATABASE_URL && !process.env.POSTGRES_PASSWORD) {
  throw new Error("DATABASE_URL or POSTGRES_PASSWORD must be set");
}

// Neon や Render などのホスト型 Postgres は SSL 必須。ローカルの docker compose
// では不要なので、接続先に応じて切り替える。
const sslRequired =
  process.env.DATABASE_SSL === "true" ||
  /[?&]sslmode=require/.test(process.env.DATABASE_URL || "");

const poolOptions = {
  ...(sslRequired ? { ssl: { rejectUnauthorized: true } } : {}),
  max: Number(process.env.PG_POOL_MAX || 10),
  connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS || 5000),
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 30000),
  statement_timeout: Number(process.env.PG_STATEMENT_TIMEOUT_MS || 10000)
};

const pool = new Pool(
  process.env.DATABASE_URL
    ? { ...poolOptions, connectionString: process.env.DATABASE_URL }
    : {
        ...poolOptions,
        host: process.env.POSTGRES_HOST || "localhost",
        port: Number(process.env.POSTGRES_PORT || 5432),
        database: process.env.POSTGRES_DB || "voiceatlas",
        user: process.env.POSTGRES_USER || "voiceatlas",
        password: process.env.POSTGRES_PASSWORD
      }
);

// Without this listener node-postgres rethrows idle-client errors as an
// uncaught exception, which kills the process whenever the database restarts.
pool.on("error", (error) => {
  log("error", { event: "pg_idle_client_error", message: error.message, stack: error.stack });
});

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

async function withTransaction(handler) {
  const client = await pool.connect();
  let started = false;
  try {
    await client.query("begin");
    started = true;
    const result = await handler(client);
    await client.query("commit");
    return result;
  } catch (error) {
    // A failed rollback (dead connection) must not mask the original error.
    if (started) await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

// Postgres only runs db/init on a first-time volume, so a mock that gains a
// table or a persona would need `docker compose down -v` to pick it up. Every
// file there is written to be idempotent, so re-applying them on each start-up
// keeps an existing volume in sync instead. Production replaces this with a
// real migration tool against RDS.
async function applyInitScripts(initDir) {
  if (!fs.existsSync(initDir)) {
    log("warn", { event: "init_scripts_missing", dir: initDir });
    return;
  }

  const files = fs.readdirSync(initDir).filter((name) => name.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(initDir, file), "utf8");
    try {
      await pool.query(sql);
      log("info", { event: "init_script_applied", file });
    } catch (error) {
      log("error", { event: "init_script_failed", file, message: error.message });
      throw error;
    }
  }
}

module.exports = { pool, waitForDb, withTransaction, applyInitScripts };
