const test = require("node:test");
const assert = require("node:assert/strict");

const { validateAndNormalizeRubricLlmOutput } = require("../src/utils/llmRubricSchema");

test("validateAndNormalizeRubricLlmOutput normalizes statuses, clamps points, and ignores unknown ids", () => {
  const criteria = [
    { id: "c1", points: 1 },
    { id: "c2", points: 2 },
    { id: "c3", points: 0.5 },
  ];

  const result = validateAndNormalizeRubricLlmOutput(
    {
      results: [
        { id: "c1", status: "YES", earned_points: 0, evidence: ["A", "B"], rationale: "met" },
        { id: "c2", status: "partial", earned_points: 2, evidence: ["x"], rationale: "partial" },
        { id: "c3", status: "no", earned_points: 999 },
        { id: "unknown", status: "met", earned_points: 1 },
      ],
    },
    criteria
  );

  assert.equal(result.ok, true);
  assert.equal(result.normalizedResultsById.get("c1").status, "met");
  assert.equal(result.normalizedResultsById.get("c1").earned_points, 1);

  assert.equal(result.normalizedResultsById.get("c2").status, "partially_met");
  assert.equal(result.normalizedResultsById.get("c2").earned_points, 1);

  assert.equal(result.normalizedResultsById.get("c3").status, "not_met");
  assert.equal(result.normalizedResultsById.get("c3").earned_points, 0);

  assert.ok(result.errors.some((message) => message.includes("Unknown criterion id ignored")));
});

test("validateAndNormalizeRubricLlmOutput rejects malformed payloads", () => {
  const result = validateAndNormalizeRubricLlmOutput(null, [{ id: "c1", points: 1 }]);

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((message) => message.includes("not a JSON object")));
});
