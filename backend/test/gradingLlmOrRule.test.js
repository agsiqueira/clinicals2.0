const test = require("node:test");
const assert = require("node:assert/strict");

delete process.env.GRADING_LLM_DISABLED;

let rubricPayload = { results: [] };
const navigatorClientPath = require.resolve("../src/llm/navigatorClient");
require.cache[navigatorClientPath] = {
  id: navigatorClientPath,
  filename: navigatorClientPath,
  loaded: true,
  exports: {
    createRubricEval: async () => JSON.stringify(rubricPayload),
  },
};

const { gradeConversation } = require("../src/utils/grading");
const { loadCase, loadGrading } = require("../src/utils/caseLoader");

function targetCriterion(overrides = {}) {
  return {
    id: "target_criterion",
    section: "reporter",
    label: "Target Criterion",
    points: 2,
    source: "user",
    mode: "llm_or_rule",
    rule: {
      any: ["fallback keyword"],
    },
    ...overrides,
  };
}

async function gradeTarget({ userText, criteria, results }) {
  rubricPayload = { results };

  const gradingResult = await gradeConversation({
    caseData: { case_id: "test_case" },
    gradingData: {
      rubric: {
        passing_score: 84,
        sections: [{ id: "reporter", label: "Reporter" }],
        criteria,
      },
    },
    conversation: [{ role: "user", content: userText }],
    supplementalInputs: {},
  });

  return gradingResult.criteria_results.find((result) => result.id === "target_criterion");
}

test("llm_or_rule uses LLM met result without fallback", async () => {
  const result = await gradeTarget({
    userText: "clear source evidence only",
    criteria: [targetCriterion()],
    results: [
      {
        id: "target_criterion",
        status: "met",
        earned_points: 0,
        evidence: ["clear source evidence only"],
        rationale: "LLM found the behavior.",
      },
    ],
  });

  assert.equal(result.status, "met");
  assert.equal(result.earned_points, 2);
  assert.deepEqual(result.evidence, ["clear source evidence only"]);
  assert.equal(result.rationale, "LLM found the behavior.");
});

test("llm_or_rule uses LLM partial result without fallback", async () => {
  const result = await gradeTarget({
    userText: "clear source evidence only fallback keyword",
    criteria: [targetCriterion()],
    results: [
      {
        id: "target_criterion",
        status: "partially_met",
        earned_points: 1,
        evidence: ["clear source evidence only"],
        rationale: "LLM found partial behavior.",
      },
    ],
  });

  assert.equal(result.status, "partially_met");
  assert.equal(result.earned_points, 1);
  assert.deepEqual(result.evidence, ["clear source evidence only"]);
  assert.equal(result.rationale, "LLM found partial behavior.");
});

test("llm_or_rule runs fallback when LLM result is missing", async () => {
  const result = await gradeTarget({
    userText: "The student said fallback keyword.",
    criteria: [
      targetCriterion(),
      {
        id: "other_criterion",
        section: "reporter",
        label: "Other Criterion",
        points: 1,
        source: "user",
        mode: "llm",
      },
    ],
    results: [
      {
        id: "other_criterion",
        status: "not_met",
        earned_points: 0,
        evidence: [],
        rationale: "Other result only.",
      },
    ],
  });

  assert.equal(result.status, "met");
  assert.equal(result.earned_points, 2);
  assert.deepEqual(result.evidence, ["fallback keyword"]);
  assert.equal(result.rationale, "Fallback rule used (LLM missing result).");
});

test("llm_or_rule fallback can override LLM not_met when rule matches", async () => {
  const result = await gradeTarget({
    userText: "The student said fallback keyword.",
    criteria: [targetCriterion()],
    results: [
      {
        id: "target_criterion",
        status: "not_met",
        earned_points: 0,
        evidence: [],
        rationale: "LLM missed the keyword.",
      },
    ],
  });

  assert.equal(result.status, "met");
  assert.equal(result.earned_points, 2);
  assert.deepEqual(result.evidence, ["fallback keyword"]);
  assert.equal(result.rationale, "Fallback rule used after LLM not_met.");
});

test("llm_or_rule remains missed when LLM returns not_met and fallback does not match", async () => {
  const result = await gradeTarget({
    userText: "The student did not say the deterministic phrase.",
    criteria: [targetCriterion()],
    results: [
      {
        id: "target_criterion",
        status: "not_met",
        earned_points: 0,
        evidence: [],
        rationale: "LLM did not find the behavior.",
      },
    ],
  });

  assert.equal(result.status, "missed");
  assert.equal(result.earned_points, 0);
  assert.deepEqual(result.evidence, []);
  assert.equal(result.rationale, "LLM did not find the behavior.");
});

test("reporter_hpi_summary_oldcarts earns full points when LLM returns not_met but HPI fallback keywords match", async () => {
  rubricPayload = {
    results: [
      {
        id: "reporter_hpi_summary_oldcarts",
        status: "not_met",
        earned_points: 0,
        evidence: [],
        rationale: "LLM did not recognize the HPI summary.",
      },
    ],
  };

  const [caseData, gradingData] = await Promise.all([
    loadCase("uti_level1"),
    loadGrading("uti_level1"),
  ]);
  const hpi = [
    "Onset started for 2 days with urinary burning during urination.",
    "The pain has a sharp burning character and is mild at 2/10 to 3/10.",
    "Timing includes blood first noticed today.",
    "She tried hydration and water with no other modifying factors.",
  ].join(" ");

  const gradingResult = await gradeConversation({
    caseData,
    gradingData,
    conversation: [
      {
        role: "user",
        content: "My name is Alex and I am a DNP student. What brings you in today?",
      },
    ],
    supplementalInputs: { hpi },
  });

  const hpiResult = gradingResult.criteria_results.find(
    (result) => result.id === "reporter_hpi_summary_oldcarts"
  );

  assert.equal(hpiResult.status, "met");
  assert.equal(hpiResult.earned_points, 2);
  assert.equal(hpiResult.points, 2);
  assert.equal(hpiResult.rationale, "Fallback rule used after LLM not_met.");
});
