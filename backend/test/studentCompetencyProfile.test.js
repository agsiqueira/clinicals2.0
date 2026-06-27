const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildCompetencyProfiles,
  buildGrowthSummary,
  computeCompetencyTrend,
  weightedAverageScore,
} = require("../src/services/studentCompetencyProfile");

test("weightedAverageScore normalizes objective evidence to 0-100", () => {
  assert.equal(
    weightedAverageScore([
      { weight: 2, percentScore: 100, achieved: true },
      { weight: 1, percentScore: 60, achieved: false },
    ]),
    87
  );
  assert.equal(weightedAverageScore([]), null);
});

test("computeCompetencyTrend uses simple first-to-latest heuristics", () => {
  assert.equal(computeCompetencyTrend([55]), "INSUFFICIENT_DATA");
  assert.equal(computeCompetencyTrend([55, 62]), "IMPROVING");
  assert.equal(computeCompetencyTrend([80, 72]), "NEEDS_PRACTICE");
  assert.equal(computeCompetencyTrend([70, 72]), "STABLE");
});

test("buildCompetencyProfiles aggregates mapped evidence across attempts", () => {
  const attempts = [{ id: "attempt-1" }, { id: "attempt-2" }];
  const evidence = [
    {
      competencyId: "communication",
      attemptId: "attempt-1",
      weight: 2,
      percentScore: 80,
      achieved: true,
      timestamp: "2026-06-01T12:00:00.000Z",
    },
    {
      competencyId: "communication",
      attemptId: "attempt-2",
      weight: 2,
      percentScore: 90,
      achieved: true,
      timestamp: "2026-06-10T12:00:00.000Z",
    },
    {
      competencyId: "rapport",
      attemptId: "attempt-1",
      weight: 1,
      percentScore: 50,
      achieved: false,
      timestamp: "2026-06-01T12:00:00.000Z",
    },
  ];

  const profiles = buildCompetencyProfiles({ attempts, evidence });
  const communication = profiles.find((item) => item.id === "communication");
  const rapport = profiles.find((item) => item.id === "rapport");

  assert.equal(communication.currentScore, 85);
  assert.equal(communication.trend, "IMPROVING");
  assert.equal(rapport.currentScore, 50);
  assert.equal(rapport.trend, "INSUFFICIENT_DATA");
});

test("buildGrowthSummary highlights strongest and weakest competencies", () => {
  const summary = buildGrowthSummary(
    [
      { id: "communication", name: "Communication", currentScore: 82, trend: "IMPROVING" },
      { id: "rapport", name: "Rapport", currentScore: 54, trend: "NEEDS_PRACTICE" },
      { id: "history_taking", name: "History Taking", currentScore: null, trend: "INSUFFICIENT_DATA" },
    ],
    3
  );

  assert.equal(summary.strongestCompetency.id, "communication");
  assert.equal(summary.needsMostPractice.id, "rapport");
  assert.equal(summary.overallCompetencyScore, 68);
  assert.equal(summary.completedSessions, 3);
});
