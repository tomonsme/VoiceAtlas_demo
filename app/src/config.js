const path = require("path");

const publicDir = path.join(__dirname, "..", "public");
const initDir = process.env.DB_INIT_DIR || path.join(__dirname, "..", "..", "db", "init");

const basicAuthEnabled = process.env.BASIC_AUTH_ENABLED !== "false";
const basicAuthUsername = process.env.BASIC_AUTH_USERNAME || "";
const basicAuthPassword = process.env.BASIC_AUTH_PASSWORD || "";
const basicAuthRealm = process.env.BASIC_AUTH_REALM || "VoiceAtlas Test";

// Walkthrough affordances that have no production equivalent -- currently the
// button that steps a specimen to its next handling stage. Set to "false" to
// present the mock without them.
const demoControlsEnabled = process.env.DEMO_CONTROLS !== "false";

const sessionCookieName = "va_session";
const sessionTtlDays = 30;

const checkinWindows = [30, 90];
const checkinWindowDays = checkinWindows[0];
// Below this many contributors the cohort average is withheld: with a handful of
// people, an "average" for a rare disease is close to naming individuals.
const cohortMinContributors = 5;

module.exports = {
  publicDir,
  initDir,
  basicAuthEnabled,
  basicAuthUsername,
  basicAuthPassword,
  basicAuthRealm,
  demoControlsEnabled,
  sessionCookieName,
  sessionTtlDays,
  checkinWindows,
  checkinWindowDays,
  cohortMinContributors
};
