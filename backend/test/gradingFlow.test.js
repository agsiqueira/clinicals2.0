const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

process.env.GRADING_LLM_DISABLED = "true";

const { gradeConversation } = require("../src/utils/grading");
const { loadCase, loadGrading } = require("../src/utils/caseLoader");

const FIXTURES_DIR = path.resolve(__dirname, "../scripts/fixtures");

function loadFixture(name) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, name), "utf8"));
}

test("gradeConversation offline still passes the ideal fixture", async () => {
  const fixture = loadFixture("ideal.json");
  const [caseData, gradingData] = await Promise.all([
    loadCase(fixture.case_id),
    loadGrading(fixture.case_id),
  ]);

  const result = await gradeConversation({
    caseData,
    gradingData,
    conversation: fixture.conversation,
    supplementalInputs: { hpi: fixture.hpi },
  });

  assert.equal(result.passed, true);
  assert.ok(result.score >= 95);
  assert.equal(result.can_unlock_next_case, true);
  assert.ok(Array.isArray(result.section_scores));
  assert.ok(Array.isArray(result.criteria_results));
  assert.equal(result.missed_red_flags.length, 0);
});

test("gradeConversation offline still fails the weak fixture and triggers critical fails", async () => {
  const fixture = loadFixture("weak.json");
  const [caseData, gradingData] = await Promise.all([
    loadCase(fixture.case_id),
    loadGrading(fixture.case_id),
  ]);

  const result = await gradeConversation({
    caseData,
    gradingData,
    conversation: fixture.conversation,
    supplementalInputs: { hpi: fixture.hpi },
  });

  assert.equal(result.passed, false);
  assert.ok(result.score < 84);
  assert.ok(result.critical_fails_triggered.length > 0);
  assert.ok(result.missed_required_questions.length > 0);
});

test("grading only awards user-sourced criteria based on user messages, not patient statements", async () => {
  const [caseData, gradingData] = await Promise.all([loadCase("uti_level1"), loadGrading("uti_level1")]);

  const result = await gradeConversation({
    caseData,
    gradingData,
    conversation: [
      { role: "user", content: "Hello, my name is Alex. What brings you in today?" },
      {
        role: "assistant",
        content:
          "I have burning when I urinate and I noticed a little blood when I wiped, but nothing else.",
      },
      { role: "user", content: "Okay, thank you for sharing that." },
    ],
    supplementalInputs: { hpi: "" },
  });

  const hematuriaCriterion = result.criteria_results.find(
    (criterion) => criterion.id === "reporter_hematuria"
  );

  assert.ok(hematuriaCriterion);
  assert.equal(hematuriaCriterion.earned_points, 0);
  assert.notEqual(hematuriaCriterion.status, "met");
});
