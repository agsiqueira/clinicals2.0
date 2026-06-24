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
const {
  buildSessionDebriefPayload,
  evaluateSessionPass,
  resolvePatientSessionForAttempt,
} = require("../src/services/sessionAttempts");

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

const firstPatientHpiAchievements = [
  {
    id: "formal-introduction",
    title: "Formal Introduction",
    weightPercent: 33.33,
    requiredForCompletion: true,
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
    weightPercent: 33.33,
    requiredForCompletion: true,
    rubricCriterionIds: ["reporter_chief_complaint"],
  },
  {
    id: "hpi-summary",
    title: "HPI Summary",
    weightPercent: 33.33,
    requiredForCompletion: true,
    rubricCriterionIds: ["reporter_hpi_summary_oldcarts"],
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

test("First Patient Complete HPI achievement maps reporter_hpi_summary_oldcarts", () => {
  const achievementResults = computeAchievementResults(firstPatientHpiAchievements, [
    {
      id: "professional_intro_name",
      label: "Introduces self by name",
      earned_points: 0.5,
      points: 0.5,
    },
    {
      id: "professional_intro_role_title",
      label: "States role",
      earned_points: 0.5,
      points: 0.5,
    },
    {
      id: "professional_preferred_name",
      label: "Uses preferred name",
      earned_points: 0.5,
      points: 0.5,
    },
    {
      id: "professional_identity_two_identifiers",
      label: "Confirms identity",
      earned_points: 1,
      points: 1,
    },
    {
      id: "professional_communication_humanism",
      label: "Humanistic communication",
      earned_points: 0.5,
      points: 0.5,
    },
    {
      id: "reporter_chief_complaint",
      label: "Chief complaint",
      earned_points: 0.5,
      points: 0.5,
    },
    {
      id: "reporter_hpi_summary_oldcarts",
      label: "HPI summary includes OLDCARTS-focused presenting illness synthesis",
      earned_points: 2,
      points: 2,
    },
  ]);

  const hpiResult = achievementResults.find((result) => result.achievementId === "hpi-summary");
  assert.equal(hpiResult.percentScore, 100);
  assert.equal(hpiResult.weightedScore, 33.33);
  assert.equal(computeSessionScore(achievementResults), 99.99);
});

test("evaluateSessionPass passes only when all required achievements are at least 84", () => {
  const passingResults = [
    { achievementId: "formal-introduction", percentScore: 84, achieved: true },
    { achievementId: "chief-complaint", percentScore: 100, achieved: true },
    { achievementId: "hpi-summary", percentScore: 90, achieved: true },
  ];

  const failingResults = [
    { achievementId: "formal-introduction", percentScore: 100, achieved: true },
    { achievementId: "chief-complaint", percentScore: 83, achieved: false },
    { achievementId: "hpi-summary", percentScore: 100, achieved: true },
  ];

  const passing = evaluateSessionPass({
    achievementResults: passingResults,
    achievements: firstPatientHpiAchievements,
  });
  const failing = evaluateSessionPass({
    achievementResults: failingResults,
    achievements: firstPatientHpiAchievements,
  });

  assert.equal(passing.passed, true);
  assert.equal(passing.blockingAchievements.length, 0);
  assert.equal(failing.passed, false);
  assert.equal(failing.blockingAchievements.length, 1);
  assert.equal(failing.blockingAchievements[0].title, "Chief Complaint");
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

test("resolvePatientSessionForAttempt uses patientSessionSlug with case id", async () => {
  const calls = [];
  const fakeClient = {
    patientSession: {
      findFirst: async (query) => {
        calls.push(query);
        return { id: "session-2", slug: query.where.slug };
      },
    },
  };

  const session = await resolvePatientSessionForAttempt({
    caseRecordId: "case-db-id",
    patientSessionSlug: "first-patient-hpi",
    client: fakeClient,
  });

  assert.equal(session.slug, "first-patient-hpi");
  assert.deepEqual(calls[0].where, {
    caseId: "case-db-id",
    slug: "first-patient-hpi",
    active: true,
  });
});
