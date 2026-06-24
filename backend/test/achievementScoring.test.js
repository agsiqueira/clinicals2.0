const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

process.env.GRADING_LLM_DISABLED = "true";

const { gradeConversation } = require("../src/utils/grading");
const { loadCase, loadGrading } = require("../src/utils/caseLoader");
const {
  computeAchievementResults,
  computeSessionScore,
  determineBadgeTier,
} = require("../src/utils/achievementScoring");
const { buildSessionDebriefPayload } = require("../src/services/sessionAttempts");

const FIXTURES_DIR = path.resolve(__dirname, "../scripts/fixtures");

function loadFixture(name) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, name), "utf8"));
}

const firstPatientAchievements = [
  {
    id: "formal-introduction",
    title: "Formal Introduction",
    weightPercent: 50,
    rubricCriterionIds: [
      "professional_intro_name",
      "professional_intro_role_title",
      "professional_preferred_name",
      "professional_identity_two_identifiers",
      "professional_communication_humanism",
    ],
  },
  {
    id: "chief-complaint",
    title: "Chief Complaint",
    weightPercent: 50,
    rubricCriterionIds: ["reporter_chief_complaint"],
  },
];

test("First Patient achievements score from existing uti_level1 criteria_results", async () => {
  const fixture = loadFixture("ideal.json");
  const [caseData, gradingData] = await Promise.all([
    loadCase(fixture.case_id),
    loadGrading(fixture.case_id),
  ]);

  const gradingResult = await gradeConversation({
    caseData,
    gradingData,
    conversation: fixture.conversation,
    supplementalInputs: { hpi: fixture.hpi },
  });

  const achievementResults = computeAchievementResults(
    firstPatientAchievements,
    gradingResult.criteria_results
  );
  const sessionScore = computeSessionScore(achievementResults);

  assert.deepEqual(
    achievementResults.map((result) => ({
      achievementId: result.achievementId,
      earnedPoints: result.earnedPoints,
      maxPoints: result.maxPoints,
      percentScore: result.percentScore,
      weightedScore: result.weightedScore,
      achieved: result.achieved,
    })),
    [
      {
        achievementId: "formal-introduction",
        earnedPoints: 3,
        maxPoints: 3,
        percentScore: 100,
        weightedScore: 50,
        achieved: true,
      },
      {
        achievementId: "chief-complaint",
        earnedPoints: 0.5,
        maxPoints: 0.5,
        percentScore: 100,
        weightedScore: 50,
        achieved: true,
      },
    ]
  );
  assert.equal(sessionScore, 100);
  assert.equal(determineBadgeTier(sessionScore), "GOLD");
});

test("determineBadgeTier follows Clinicals 2.0 thresholds", () => {
  assert.equal(determineBadgeTier(84), "GOLD");
  assert.equal(determineBadgeTier(83.99), "SILVER");
  assert.equal(determineBadgeTier(50), "SILVER");
  assert.equal(determineBadgeTier(49.99), "BRONZE");
  assert.equal(determineBadgeTier(0.01), "BRONZE");
  assert.equal(determineBadgeTier(0), "NONE");
});

test("buildSessionDebriefPayload returns concise Dr. Martinez debrief data", () => {
  const debrief = buildSessionDebriefPayload({
    sessionAttemptId: "attempt-1",
    sessionScore: 100,
    badgeTier: "GOLD",
    achievements: firstPatientAchievements,
    achievementResults: [
      {
        achievementId: "formal-introduction",
        earnedPoints: 3,
        maxPoints: 3,
        percentScore: 100,
        weightedScore: 50,
        achieved: true,
        feedback: "Mapped rubric criteria were met.",
      },
      {
        achievementId: "chief-complaint",
        earnedPoints: 0.5,
        maxPoints: 0.5,
        percentScore: 100,
        weightedScore: 50,
        achieved: true,
        feedback: "Mapped rubric criteria were met.",
      },
    ],
    feedback: {
      recognition: "You completed the encounter with a strong professional opening.",
      coaching: "Keep asking one open-ended question to clarify the main concern.",
      encouragement: "Keep practicing with intention.",
      summary: "Session score: 100%. Badge tier: GOLD.",
    },
  });

  assert.equal(debrief.sessionAttemptId, "attempt-1");
  assert.equal(debrief.badgeLabel, "Gold");
  assert.equal(
    debrief.greeting,
    "Thanks for completing the session. As you review your report, pay particular attention to Formal Introduction and Chief Complaint. When you're ready, I'd be happy to discuss what happened and how to improve next time."
  );
  assert.equal(debrief.achievementResults.length, 2);
  assert.equal(debrief.achievementResults[0].title, "Formal Introduction");
  assert.match(debrief.recognition, /professional opening/);
  assert.match(debrief.coaching, /open-ended question/);
  assert.match(debrief.encouragement, /Keep practicing/);
});

test("buildSessionDebriefPayload derives greeting focus from weakest achievement", () => {
  const silverDebrief = buildSessionDebriefPayload({
    sessionAttemptId: "attempt-silver",
    sessionScore: 67,
    badgeTier: "SILVER",
    achievements: firstPatientAchievements,
    achievementResults: [
      {
        achievementId: "formal-introduction",
        earnedPoints: 1,
        maxPoints: 3,
        percentScore: 33,
        weightedScore: 16.5,
        achieved: false,
      },
      {
        achievementId: "chief-complaint",
        earnedPoints: 0.5,
        maxPoints: 0.5,
        percentScore: 100,
        weightedScore: 50,
        achieved: true,
      },
    ],
  });

  const bronzeDebrief = buildSessionDebriefPayload({
    sessionAttemptId: "attempt-bronze",
    sessionScore: 25,
    badgeTier: "BRONZE",
    achievements: firstPatientAchievements,
    achievementResults: [
      {
        achievementId: "formal-introduction",
        earnedPoints: 3,
        maxPoints: 3,
        percentScore: 100,
        weightedScore: 50,
        achieved: true,
      },
      {
        achievementId: "chief-complaint",
        earnedPoints: 0,
        maxPoints: 0.5,
        percentScore: 0,
        weightedScore: 0,
        achieved: false,
      },
    ],
  });

  assert.equal(
    silverDebrief.greeting,
    "Thanks for completing the session. As you review your report, pay particular attention to Formal Introduction. When you're ready, I'd be happy to discuss what happened and how to improve next time."
  );
  assert.equal(
    bronzeDebrief.greeting,
    "Thanks for completing the session. As you review your report, pay particular attention to Chief Complaint. When you're ready, I'd be happy to discuss what happened and how to improve next time."
  );
});
