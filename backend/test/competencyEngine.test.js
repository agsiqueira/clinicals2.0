const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { COMPETENCY_DEFINITIONS } = require("../src/config/competencies");
const { OBJECTIVE_COMPETENCY_MAPPINGS } = require("../src/config/objectiveCompetencies");
const {
  buildCompetencyEvidence,
  evaluateCompetencyEvidence,
  getCompetencies,
  getObjectiveCompetencies,
  getPrimaryCompetencies,
  getSecondaryCompetencies,
  summarizeCompetencyEvidence,
} = require("../src/services/competencyEngine");

test("competency definitions expose active data-driven configuration records", () => {
  assert.equal(COMPETENCY_DEFINITIONS.length, 10);
  assert.ok(COMPETENCY_DEFINITIONS.every((competency) => competency.id));
  assert.ok(COMPETENCY_DEFINITIONS.every((competency) => competency.name));
  assert.ok(COMPETENCY_DEFINITIONS.every((competency) => Number.isFinite(competency.displayOrder)));
  assert.ok(COMPETENCY_DEFINITIONS.some((competency) => competency.id === "clinical_reasoning"));
  assert.equal(getCompetencies()[0].id, "communication");
});

test("objective competency mappings are separate weighted configuration", () => {
  assert.ok(OBJECTIVE_COMPETENCY_MAPPINGS["chief-complaint"]);
  assert.deepEqual(getObjectiveCompetencies("introduces_self"), [
    { competencyId: "communication", weight: 2 },
    { competencyId: "professionalism", weight: 2 },
    { competencyId: "rapport", weight: 1 },
  ]);
});

test("session metadata helpers tolerate sessions without competency fields", () => {
  assert.deepEqual(getPrimaryCompetencies({ id: "session-1" }), []);
  assert.deepEqual(getSecondaryCompetencies({ id: "session-1" }), []);
  assert.deepEqual(
    getPrimaryCompetencies({ primaryCompetencies: ["communication", "history_taking"] }),
    ["communication", "history_taking"]
  );
  assert.deepEqual(getSecondaryCompetencies({ secondaryCompetencies: ["rapport"] }), ["rapport"]);
});

test("buildCompetencyEvidence maps evaluated objectives without calculating scores", () => {
  const evidence = buildCompetencyEvidence({
    studentId: "student-1",
    sessionId: "session-1",
    attemptId: "attempt-1",
    timestamp: "2026-06-26T12:00:00.000Z",
    objectives: [
      { id: "objective-1", slug: "formal-introduction" },
      { id: "objective-2", slug: "chief-complaint" },
    ],
    evaluatedObjectives: [
      { achievementId: "objective-1", achieved: true, percentScore: 100 },
      { achievementId: "objective-2", achieved: false, percentScore: 60 },
    ],
  });

  assert.equal(evidence.length, 6);
  assert.ok(
    evidence.some(
      (item) =>
        item.competencyId === "communication" &&
        item.objectiveKey === "formal-introduction" &&
        item.weight === 2 &&
        item.achieved === true
    )
  );
  assert.ok(
    evidence.some(
      (item) =>
        item.competencyId === "history_taking" &&
        item.objectiveKey === "chief-complaint" &&
        item.weight === 3 &&
        item.achieved === false
    )
  );
});

test("evaluateCompetencyEvidence returns a future-facing non-persistent object", () => {
  const result = evaluateCompetencyEvidence({
    studentId: "student-1",
    attemptId: "attempt-1",
    session: {
      id: "session-1",
      title: "UTI Level 1",
      primaryCompetencies: ["communication"],
      secondaryCompetencies: ["rapport"],
    },
    objectives: [{ id: "objective-1", slug: "formal-introduction" }],
    evaluatedObjectives: [{ achievementId: "objective-1", achieved: true, percentScore: 100 }],
  });

  assert.deepEqual(result.primaryCompetencies, ["communication"]);
  assert.deepEqual(result.secondaryCompetencies, ["rapport"]);
  assert.equal(result.evidence.length, 3);
  assert.ok(result.summary.some((item) => item.competencyId === "communication"));
});

test("summarizeCompetencyEvidence aggregates achieved and possible weight", () => {
  const summary = summarizeCompetencyEvidence([
    { competencyId: "communication", weight: 2, achieved: true },
    { competencyId: "communication", weight: 1, achieved: false },
    { competencyId: "rapport", weight: 1, achieved: true },
  ]);

  const communication = summary.find((item) => item.competencyId === "communication");
  assert.equal(communication.achievedWeight, 2);
  assert.equal(communication.possibleWeight, 3);
  assert.equal(communication.evidenceCount, 2);
});

test("session attempt finalization hooks the competency engine without persistence", () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, "../src/services/sessionAttempts.js"),
    "utf8"
  );

  assert.match(source, /evaluateCompetencyEvidence/);
  assert.doesNotMatch(source, /competency_evidence/);
  assert.doesNotMatch(source, /competency_summary/);
});
