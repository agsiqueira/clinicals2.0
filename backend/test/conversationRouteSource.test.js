const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("conversation detail response includes patientSessionSlug from linked session attempt", () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, "../src/routes/conversations.js"),
    "utf8"
  );

  assert.match(source, /sessionAttempt:\s*{\s*include:\s*{\s*patientSession:\s*true/s);
  assert.match(
    source,
    /patientSessionSlug:\s*conversation\.sessionAttempt\?\.patientSession\?\.slug\s*\|\|\s*null/
  );
});
