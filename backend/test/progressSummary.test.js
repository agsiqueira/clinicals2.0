const test = require("node:test");
const assert = require("node:assert/strict");

const {
  calculateCasePointsAwarded,
  getSubmissionEarnedPoints,
  summarizeUserProgressFromConversations,
} = require("../src/utils/progressSummary");

function makeConversation({
  caseId,
  title = caseId,
  level = 1,
  score = 0,
  earnedPoints,
  availablePoints = 46,
  submittedAt = "2026-03-09T12:00:00.000Z",
}) {
  return {
    patientCase: {
      caseId,
      title,
      level,
    },
    submission: {
      score,
      submittedAt,
      details: {
        earned_points: earnedPoints,
        available_points: availablePoints,
      },
    },
  };
}

test("calculateCasePointsAwarded multiplies case level by earned rubric points", () => {
  assert.equal(calculateCasePointsAwarded({ level: 1, earnedPoints: 46 }), 46);
  assert.equal(calculateCasePointsAwarded({ level: 2, earnedPoints: 38 }), 76);
});

test("getSubmissionEarnedPoints falls back to score percent when earned points are missing", () => {
  const earnedPoints = getSubmissionEarnedPoints({
    score: 84,
    details: {
      available_points: 46,
    },
  });

  assert.equal(earnedPoints, 39);
});

test("summarizeUserProgressFromConversations keeps only the highest scoring retry for each case", () => {
  const summary = summarizeUserProgressFromConversations([
    makeConversation({
      caseId: "uti_level1",
      title: "UTI Level 1",
      level: 1,
      score: 70,
      earnedPoints: 32,
      submittedAt: "2026-03-09T09:00:00.000Z",
    }),
    makeConversation({
      caseId: "uti_level1",
      title: "UTI Level 1",
      level: 1,
      score: 93,
      earnedPoints: 43,
      submittedAt: "2026-03-09T11:00:00.000Z",
    }),
  ]);

  assert.equal(summary.totalPoints, 43);
  assert.ok(Array.isArray(summary.bestCases));
  assert.equal(summary.bestCases.length, 1);
  assert.equal(summary.bestCases[0].caseId, "uti_level1");
  assert.equal(summary.bestCases[0].casePointsAwarded, 43);
  assert.equal(summary.bestCases[0].score, 93);
});

test("summarizeUserProgressFromConversations sums best results across multiple cases and derives user level", () => {
  const summary = summarizeUserProgressFromConversations([
    makeConversation({
      caseId: "uti_level1",
      title: "UTI Level 1",
      level: 1,
      score: 89,
      earnedPoints: 41,
    }),
    makeConversation({
      caseId: "uri_level2",
      title: "URI Level 2",
      level: 2,
      score: 80,
      earnedPoints: 35,
    }),
  ]);

  assert.equal(summary.totalPoints, 111);
  assert.equal(summary.level, 2);
  assert.deepEqual(
    summary.bestCases.map((entry) => ({
      caseId: entry.caseId,
      casePointsAwarded: entry.casePointsAwarded,
    })),
    [
      { caseId: "uri_level2", casePointsAwarded: 70 },
      { caseId: "uti_level1", casePointsAwarded: 41 },
    ]
  );
});
