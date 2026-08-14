const crypto = require("crypto");
const express = require("express");
const path = require("path");
const { pool, waitForDb, applyInitScripts } = require("./db");
const { log, redact } = require("./log");
const { publicDir, initDir, basicAuthEnabled } = require("./config");
const { requireBasicAuth, loadSession } = require("./auth");

const app = express();

// Behind the Cloudflare tunnel: makes req.secure and req.ip reflect the real
// client rather than the proxy hop.
app.set("trust proxy", true);

app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.set("X-Request-Id", req.id);
  const startedAt = process.hrtime.bigint();
  res.on("finish", () => {
    log(res.statusCode >= 500 ? "error" : "info", {
      event: "request",
      requestId: req.id,
      method: req.method,
      path: redact(req.originalUrl),
      status: res.statusCode,
      durationMs: Math.round(Number(process.hrtime.bigint() - startedAt) / 1e5) / 10
    });
  });
  next();
});

app.use(requireBasicAuth);
app.use(express.json({ limit: "1mb" }));
app.use(
  express.static(publicDir, {
    setHeaders: (res, filePath) => {
      // The worker must be revalidated on every load, otherwise a cached copy
      // keeps serving an old caching policy.
      if (filePath.endsWith("sw.js")) {
        res.set("Cache-Control", "no-cache");
        return;
      }
      // Icons and brand assets are stable; the rest revalidates via ETag.
      if (
        filePath.includes(`${path.sep}icons${path.sep}`) ||
        filePath.includes(`${path.sep}assets${path.sep}`)
      ) {
        res.set("Cache-Control", "public, max-age=604800");
      }
    }
  })
);
app.use(loadSession);

app.use(require("./routes/health"));
app.use(require("./routes/auth"));
app.use(require("./routes/profile"));
app.use(require("./routes/checkins"));
app.use(require("./routes/research"));

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "not_found" });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.use((error, req, res, _next) => {
  const status = error.status || 500;

  if (status >= 500) {
    log("error", {
      event: "unhandled_error",
      requestId: req.id,
      method: req.method,
      path: redact(req.originalUrl),
      status,
      message: error.message,
      stack: error.stack
    });
    // Never surface internal messages: they leak table, column and constraint names.
    return res.status(status).json({ error: "server_error", requestId: req.id });
  }

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ error: "invalid_json" });
  }
  if (error.type === "entity.too.large") {
    return res.status(413).json({ error: "payload_too_large" });
  }

  log("warn", {
    event: "request_error",
    requestId: req.id,
    method: req.method,
    path: redact(req.originalUrl),
    status,
    message: error.message
  });
  return res.status(status).json({ error: error.code || "request_error", message: error.message });
});

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
