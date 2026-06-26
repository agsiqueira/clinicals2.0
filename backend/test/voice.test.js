const test = require("node:test");
const assert = require("node:assert/strict");

const { getTtsUnavailableReason } = require("../src/routes/voice");

test("voice TTS detects key_model_access_denied from upstream response body", () => {
  const reason = getTtsUnavailableReason({
    status: 403,
    responseBody: JSON.stringify({
      error: {
        code: "key_model_access_denied",
        message: "The API key does not have access to model kokoro.",
      },
    }),
  });

  assert.equal(reason, "key_model_access_denied");
});

test("voice TTS ignores unrelated upstream errors", () => {
  const reason = getTtsUnavailableReason({
    status: 500,
    responseBody: JSON.stringify({
      error: {
        code: "internal_error",
        message: "Temporary upstream failure.",
      },
    }),
  });

  assert.equal(reason, null);
});
