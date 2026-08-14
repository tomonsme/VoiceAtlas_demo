const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;

// User ids double as bearer credentials in this prototype, so they must never
// reach the logs verbatim.
function redact(value) {
  return String(value == null ? "" : value).replace(uuidPattern, "<id>");
}

function log(level, fields) {
  const line = JSON.stringify({ level, time: new Date().toISOString(), ...fields });
  if (level === "error") console.error(line);
  else console.log(line);
}

module.exports = { log, redact };
