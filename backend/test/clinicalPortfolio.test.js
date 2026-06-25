const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { buildClinicalPortfolio } = require("../src/services/clinicalPortfolio");

function makeClient({
  user = {
    id: "user-1",
    name: "Taylor Student",
    email: "taylor@example.com",
    progress: { level: 2, xp: 150 },
    streak: null,
  },
  learningPath = null,
  definitions = [],
  competencyResults = [],
  recentAttempts = [],
} = {}) {
  return {
    user: {
      findUnique: async () => user,
    },
    learningPath: {
      findUnique: async () => learningPath,
    },
    motivationalAchievement: {
      findMany: async () => definitions,
    },
    achievementResult: {
      findMany: async () => competencyResults,
    },
    sessionAttempt: {
      findMany: async () => recentAttempts,
    },
  };
}

function makeDefinition({ slug, title, category = "milestone", sortOrder = 1, progress }) {
  return {
    id: `${slug}-id`,
    slug,
    title,
    description: `${title} description`,
    category,
    icon: "★",
    targetValue: 1,
    sortOrder,
    userAchievements: progress ? [progress] : [],
  };
}

function makePath() {
  return {
    id: "path-1",
    slug: "clinical-encounter-foundations",
    title: "Clinical Encounter Foundations",
    units: [
      {
        id: "unit-1",
        slug: "unit-1-clinical-encounter",
        title: "Unit 1: First Clinical Encounter",
        sortOrder: 1,
        sessions: [
          {
            id: "session-1",
            slug: "first-patient",
            title: "Taylor Reed: Introduction & Chief Complaint",
            sortOrder: 1,
            attempts: [
              {
                sessionScore: 90,
                scoredAt: "2026-06-21T12:00:00.000Z",
              },
            ],
          },
          {
            id: "session-2",
            slug: "first-patient-hpi",
            title: "Taylor Reed: Complete Clinical Encounter",
            sortOrder: 2,
            attempts: [
              {
                sessionScore: 70,
                scoredAt: "2026-06-22T12:00:00.000Z",
              },
            ],
          },
        ],
      },
      {
        id: "unit-2",
        slug: "seasonal-allergies",
        title: "Seasonal Allergies",
        sortOrder: 2,
        sessions: [
          {
            id: "session-3",
            slug: "seasonal-allergies-complete-hpi",
            title: "Sarah Johnson: Complete Clinical Encounter",
            sortOrder: 1,
            attempts: [],
          },
        ],
      },
    ],
  };
}

test("clinical portfolio returns response shape with empty/new user state", async () => {
  const portfolio = await buildClinicalPortfolio({
    userId: "user-1",
    client: makeClient({
      user: {
        id: "user-1",
        name: null,
        email: "student@example.com",
        progress: null,
        streak: null,
      },
    }),
  });

  assert.equal(portfolio.identity.displayName, "student@example.com");
  assert.equal(portfolio.identity.professionalLevel, 1);
  assert.equal(portfolio.identity.levelTitle, "Student Clinician");
  assert.equal(portfolio.identity.xp, 0);
  assert.equal(portfolio.identity.nextLevelXp, 100);
  assert.deepEqual(portfolio.streak, {
    currentCount: 0,
    longestCount: 0,
    lastActivityDate: null,
    status: "START",
  });
  assert.deepEqual(portfolio.professionalQualities, []);
  assert.deepEqual(portfolio.mentorCommendations, []);
  assert.deepEqual(portfolio.recentPatients, []);
});

test("clinical portfolio milestones include locked definitions when no progress exists", async () => {
  const portfolio = await buildClinicalPortfolio({
    userId: "user-1",
    client: makeClient({
      definitions: [
        makeDefinition({
          slug: "first-gold-badge",
          title: "First Gold Badge",
          category: "milestone",
        }),
      ],
    }),
  });

  assert.equal(portfolio.milestones.length, 1);
  assert.equal(portfolio.milestones[0].slug, "first-gold-badge");
  assert.equal(portfolio.milestones[0].status, "LOCKED");
  assert.equal(portfolio.milestones[0].currentValue, 0);
  assert.equal(portfolio.milestones[0].targetValue, 1);
  assert.equal(portfolio.milestones[0].earnedAt, null);
});

test("clinical portfolio earned and in-progress motivational achievements appear correctly", async () => {
  const earnedAt = new Date("2026-06-23T10:00:00.000Z");
  const portfolio = await buildClinicalPortfolio({
    userId: "user-1",
    client: makeClient({
      definitions: [
        makeDefinition({
          slug: "first-gold-badge",
          title: "First Gold Badge",
          category: "milestone",
          progress: {
            status: "EARNED",
            currentValue: 1,
            targetValue: 1,
            earnedAt,
          },
        }),
        makeDefinition({
          slug: "hpi-builder",
          title: "HPI Builder",
          category: "competency",
          progress: {
            status: "IN_PROGRESS",
            currentValue: 2,
            targetValue: 3,
            earnedAt: null,
          },
        }),
      ],
    }),
  });

  assert.equal(portfolio.milestones[0].status, "EARNED");
  assert.equal(portfolio.milestones[0].earnedAt, earnedAt);
  assert.equal(portfolio.milestones[1].status, "IN_PROGRESS");
  assert.equal(portfolio.milestones[1].currentValue, 2);
});

test("clinical portfolio learningPathProgress counts sessions completed with best score >= 84", async () => {
  const portfolio = await buildClinicalPortfolio({
    userId: "user-1",
    client: makeClient({
      learningPath: makePath(),
    }),
  });

  assert.equal(portfolio.learningPathProgress.pathTitle, "Clinical Encounter Foundations");
  assert.equal(portfolio.learningPathProgress.completedSessions, 1);
  assert.equal(portfolio.learningPathProgress.totalSessions, 3);
  assert.equal(portfolio.learningPathProgress.percentComplete, 33);
  assert.equal(portfolio.learningPathProgress.currentUnit.slug, "unit-1-clinical-encounter");
  assert.equal(portfolio.learningPathProgress.currentSession.slug, "first-patient-hpi");
});

test("clinical portfolio competencies aggregate AchievementResult scores", async () => {
  const portfolio = await buildClinicalPortfolio({
    userId: "user-1",
    client: makeClient({
      competencyResults: [
        {
          id: "result-1",
          percentScore: 75,
          achieved: false,
          createdAt: "2026-06-20T12:00:00.000Z",
          achievement: {
            slug: "formal-introduction",
            title: "Formal Introduction",
          },
          sessionAttempt: {
            scoredAt: "2026-06-20T12:00:00.000Z",
          },
        },
        {
          id: "result-2",
          percentScore: 92,
          achieved: true,
          createdAt: "2026-06-21T12:00:00.000Z",
          achievement: {
            slug: "formal-introduction",
            title: "Formal Introduction",
          },
          sessionAttempt: {
            scoredAt: "2026-06-21T12:00:00.000Z",
          },
        },
      ],
    }),
  });

  const formalIntroduction = portfolio.competencies.find(
    (competency) => competency.slug === "formal-introduction"
  );

  assert.equal(formalIntroduction.attempts, 2);
  assert.equal(formalIntroduction.achievedCount, 1);
  assert.equal(formalIntroduction.bestPercentScore, 92);
  assert.equal(formalIntroduction.latestPercentScore, 92);
  assert.ok(portfolio.competencies.some((competency) => competency.slug === "chief-complaint"));
  assert.ok(portfolio.competencies.some((competency) => competency.slug === "hpi-summary"));
});

test("clinical portfolio recentPatients returns latest scored attempts", async () => {
  const portfolio = await buildClinicalPortfolio({
    userId: "user-1",
    client: makeClient({
      recentAttempts: [
        {
          id: "attempt-1",
          sessionScore: 91,
          badgeTier: "GOLD",
          passed: true,
          scoredAt: "2026-06-24T12:00:00.000Z",
          patientSession: {
            title: "Sarah Johnson: Complete Clinical Encounter",
            patientCase: {
              title: "Seasonal Allergies",
              caseId: "seasonal_allergies_level1",
            },
          },
        },
      ],
    }),
  });

  assert.equal(portfolio.recentPatients.length, 1);
  assert.equal(portfolio.recentPatients[0].sessionAttemptId, "attempt-1");
  assert.equal(portfolio.recentPatients[0].patientSessionTitle, "Sarah Johnson: Complete Clinical Encounter");
  assert.equal(portfolio.recentPatients[0].caseTitle, "Seasonal Allergies");
  assert.equal(portfolio.recentPatients[0].caseId, "seasonal_allergies_level1");
  assert.equal(portfolio.recentPatients[0].sessionScore, 91);
  assert.equal(portfolio.recentPatients[0].badgeTier, "GOLD");
});

test("clinical portfolio returns empty professional qualities and mentor commendations for v1", async () => {
  const portfolio = await buildClinicalPortfolio({
    userId: "user-1",
    client: makeClient(),
  });

  assert.deepEqual(portfolio.professionalQualities, []);
  assert.deepEqual(portfolio.mentorCommendations, []);
});

test("clinical portfolio route is mounted at /api/clinical-portfolio", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../src/index.js"), "utf8");

  assert.match(source, /clinicalPortfolioRouter/);
  assert.match(source, /app\.use\("\/api\/clinical-portfolio", clinicalPortfolioRouter\)/);
});
