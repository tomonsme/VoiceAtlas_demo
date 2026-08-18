/* コンテナでの起動。DBを待ち、初期化SQLを適用してからリッスンする。 */

const app = require("./app");
const { pool, waitForDb, applyInitScripts } = require("./db");
const { log } = require("./log");
const { initDir, basicAuthEnabled } = require("./config");

process.on("unhandledRejection", (reason) => {
  log("error", {
    event: "unhandled_rejection",
    message: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined
  });
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  log("error", { event: "uncaught_exception", message: error.message, stack: error.stack });
  process.exit(1);
});

waitForDb()
  .then(() => applyInitScripts(initDir))
  .then(() => {
    const port = Number(process.env.PORT || 3000);
    const server = app.listen(port, () => {
      log("info", { event: "listening", port, basicAuthEnabled: basicAuthEnabled });
    });

    const shutdown = (signal) => {
      log("info", { event: "shutdown", signal });
      server.close(() => {
        pool.end().finally(() => process.exit(0));
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  })
  .catch((error) => {
    log("error", { event: "startup_failed", message: error.message, stack: error.stack });
    process.exit(1);
  });
