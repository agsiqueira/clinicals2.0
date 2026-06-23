const test = require("node:test");
const assert = require("node:assert/strict");

const { buildAttemptSummaries } = require("../src/utils/attemptHistory");

test("buildAttemptSummaries numbers previous attempts from oldest to newest while returning newest first", () => {
  const attempts = buildAttemptSummaries([
    {
      id: "conv-newest",
      submittedAt: "2026-03-10T12:00:00.000Z",
      submission: {
        score: 92,
        details: { passed: true },
      },
    },
    {
      id: "conv-oldest",
      submittedAt: "2026-03-08T12:00:00.000Z",
      submission: {
        score: 78,
        details: { passed: false },
      },
    },
  ]);

  assert.deepEqual(attempts, [
    {
      conversationId: "conv-newest",
      submittedAt: "2026-03-10T12:00:00.000Z",
      score: 92,
      passed: true,
      attemptNumber: 2,
    },
    {
      conversationId: "conv-oldest",
      submittedAt: "2026-03-08T12:00:00.000Z",
      score: 78,
      passed: false,
      attemptNumber: 1,
    },
  ]);
});

test("buildAttemptSummaries tolerates missing submission details", () => {
  const attempts = buildAttemptSummaries([
    {
      id: "conv-1",
      submittedAt: null,
      submission: null,
    },
  ]);

  assert.deepEqual(attempts, [
    {
      conversationId: "conv-1",
      submittedAt: null,
      score: null,
      passed: null,
      attemptNumber: 1,
    },
  ]);
});
