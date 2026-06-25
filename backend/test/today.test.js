const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { buildToday } = require("../src/services/today");

function makeClient({
  user = {
    id: "user-1",
    name: "Taylor Student",
    email: "taylor@example.com",
    progress: { level: 1, xp: 40 },
    streak: null,
  },
  pathData = makePath(),
  definitions = makeDefinitions(),
  competencyResults = [],
  recentAttempts = [],
} = {}) {
  return {
    user: {
      findUnique: async () => user,
    },
    learningPath: {
      findUnique: async () => pathData,
      findMany: async () => (pathData ? [pathData] : []),
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

function makeDefinition({ slug, title, category = "milestone", currentValue = 0, targetValue = 1, status }) {
  return {
    id: `${slug}-id`,
    slug,
    title,
    description: `${title} description`,
    category,
    icon: slug === "first-gold-badge" ? "🥇" : "★",
    targetValue,
    userAchievements: status
      ? [
          {
            status,
            currentValue,
            targetValue,
            earnedAt: status === "EARNED" ? new Date("2026-06-20T12:00:00.000Z") : null,
          },
        ]
      : [],
  };
}

function makeDefinitions(extra = []) {
  return [
    makeDefinition({ slug: "first-gold-badge", title: "First Gold Badge" }),
    makeDefinition({
      slug: "hpi-builder",
      title: "HPI Builder",
      category: "competency",
      currentValue: 2,
      targetValue: 3,
      status: "IN_PROGRESS",
    }),
    ...extra,
  ];
}

function makeSession({ slug, title, sortOrder, attempts = [], requiresHpi = false, caseId = "uti_level1" }) {
  return {
    id: `${slug}-id`,
    slug,
    title,
    objective: `Objective for ${title}`,
    description: `Description for ${title}`,
    estimatedMinutesMin: requiresHpi ? 5 : 3,
    estimatedMinutesMax: requiresHpi ? 8 : 5,
    goldThreshold: 84,
    silverThreshold: 50,
    bronzeThreshold: 1,
    active: true,
    sortOrder,
    patientCase: {
      id: `${caseId}-db-id`,
      caseId,
      title: caseId === "seasonal_allergies_level1" ? "Seasonal Allergies" : "UTI Level 1",
    },
    achievements: [
      {
        id: `${slug}-intro`,
        slug: "formal-introduction",
        title: "Formal Introduction",
        weightPercent: requiresHpi ? 33.33 : 50,
        rubricCriterionIds: ["professional_intro_name"],
      },
      {
        id: `${slug}-chief`,
        slug: "chief-complaint",
        title: "Chief Complaint",
        weightPercent: requiresHpi ? 33.33 : 50,
        rubricCriterionIds: ["reporter_chief_complaint"],
      },
      ...(requiresHpi
        ? [
            {
              id: `${slug}-hpi`,
              slug: "hpi-summary",
              title: "HPI Summary",
              weightPercent: 33.34,
              rubricCriterionIds: ["reporter_hpi_summary_oldcarts"],
            },
          ]
        : []),
    ],
    attempts,
  };
}

function makeAttempt({ score, badgeTier = "GOLD", scoredAt = "2026-06-20T12:00:00.000Z" }) {
  return {
    sessionScore: score,
    badgeTier,
    status: "SCORED",
    scoredAt,
    submittedAt: scoredAt,
    startedAt: scoredAt,
  };
}

function makePath({ firstAttempts = [], hpiAttempts = [], allergyAttempts = [] } = {}) {
  return {
    id: "path-1",
    slug: "clinical-encounter-foundations",
    title: "Clinical Encounter Foundations",
    description: "Foundational patient interview and clinical encounter skills.",
    active: true,
    sortOrder: 1,
    preceptorPersona: null,
    units: [
      {
        id: "unit-1",
        slug: "unit-1-clinical-encounter",
        title: "Unit 1: The Clinical Encounter",
        objective: "Begin a clinical encounter.",
        active: true,
        sortOrder: 1,
        sessions: [
          makeSession({
            slug: "first-patient",
            title: "First Patient: Introduction and Chief Complaint",
            sortOrder: 1,
            attempts: firstAttempts,
          }),
          makeSession({
            slug: "first-patient-hpi",
            title: "First Patient: Complete HPI",
            sortOrder: 2,
            attempts: hpiAttempts,
            requiresHpi: true,
          }),
        ],
      },
      {
        id: "unit-2",
        slug: "seasonal-allergies",
        title: "Seasonal Allergies",
        objective: "Complete a focused allergy encounter.",
        active: true,
        sortOrder: 2,
        sessions: [
          makeSession({
            slug: "seasonal-allergies-complete-hpi",
            title: "Seasonal Allergies: Complete HPI",
            sortOrder: 1,
            attempts: allergyAttempts,
            requiresHpi: true,
            caseId: "seasonal_allergies_level1",
          }),
        ],
      },
    ],
  };
}

test("today returns a new learner briefing", async () => {
  const today = await buildToday({
    userId: "user-1",
    client: makeClient(),
  });

  assert.equal(today.recommendedEncounter.patientSessionSlug, "first-patient");
  assert.equal(today.recommendedEncounter.displayTitle, "Taylor Reed: Introduction & Chief Complaint");
  assert.match(today.dailyBriefing.motivation, /Welcome/);
  assert.match(today.dailyBriefing.focus, /professional introduction/);
  assert.equal(today.dailyBriefing.nextGoal.slug, "first-gold-badge");
});

test("today recommends the first available forward encounter", async () => {
  const today = await buildToday({
    userId: "user-1",
    client: makeClient({
      pathData: makePath({
        firstAttempts: [makeAttempt({ score: 90 })],
      }),
      competencyResults: [
        {
          percentScore: 72,
          achieved: false,
          achievement: { slug: "hpi-summary", title: "HPI Summary" },
          sessionAttempt: { scoredAt: "2026-06-21T12:00:00.000Z" },
        },
      ],
    }),
  });

  assert.equal(today.recommendedEncounter.patientSessionSlug, "first-patient-hpi");
  assert.equal(today.recommendedEncounter.launchParams.requiresHpi, true);
  assert.match(today.dailyBriefing.focus, /HPI Summary|history/);
});

test("today recommends a blocked retry when no forward session is available", async () => {
  const today = await buildToday({
    userId: "user-1",
    client: makeClient({
      pathData: makePath({
        firstAttempts: [makeAttempt({ score: 70, badgeTier: "SILVER" })],
      }),
    }),
  });

  assert.equal(today.recommendedEncounter.patientSessionSlug, "first-patient");
  assert.match(today.dailyBriefing.motivation, /84%/);
  assert.equal(today.dailyBriefing.nextGoal.type, "unlock");
  assert.equal(today.dailyBriefing.nextGoal.currentValue, 70);
});

test("today reinforces recent Gold motivation", async () => {
  const today = await buildToday({
    userId: "user-1",
    client: makeClient({
      pathData: makePath({
        firstAttempts: [makeAttempt({ score: 90, badgeTier: "GOLD" })],
      }),
      recentAttempts: [
        {
          id: "attempt-1",
          badgeTier: "GOLD",
          sessionScore: 90,
          scoredAt: "2026-06-22T12:00:00.000Z",
          patientSession: { patientCase: { caseId: "uti_level1" } },
        },
      ],
    }),
  });

  assert.match(today.dailyBriefing.motivation, /Gold/);
});

test("today selects the closest in-progress achievement as next goal", async () => {
  const today = await buildToday({
    userId: "user-1",
    client: makeClient({
      pathData: makePath({
        firstAttempts: [makeAttempt({ score: 90 })],
      }),
      definitions: makeDefinitions([
        makeDefinition({
          slug: "comeback-20-point-improvement",
          title: "Comeback Clinician",
          category: "improvement",
          currentValue: 5,
          targetValue: 20,
          status: "IN_PROGRESS",
        }),
      ]),
    }),
  });

  assert.equal(today.dailyBriefing.nextGoal.slug, "hpi-builder");
  assert.equal(today.dailyBriefing.nextGoal.currentValue, 2);
  assert.equal(today.dailyBriefing.nextGoal.targetValue, 3);
});

test("today returns completion briefing when all encounters are complete", async () => {
  const today = await buildToday({
    userId: "user-1",
    client: makeClient({
      pathData: makePath({
        firstAttempts: [makeAttempt({ score: 90 })],
        hpiAttempts: [makeAttempt({ score: 92 })],
        allergyAttempts: [makeAttempt({ score: 94 })],
      }),
    }),
  });

  assert.equal(today.recommendedEncounter, null);
  assert.match(today.dailyBriefing.motivation, /completed/);
  assert.match(today.dailyBriefing.focus, /Clinical Portfolio/);
});

test("today route is mounted at /api/today", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../src/index.js"), "utf8");

  assert.match(source, /todayRouter/);
  assert.match(source, /app\.use\("\/api\/today", todayRouter\)/);
});
