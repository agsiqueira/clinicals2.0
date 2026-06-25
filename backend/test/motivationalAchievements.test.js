const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  MOTIVATIONAL_ACHIEVEMENT_DEFINITIONS,
  EVALUATED_ACHIEVEMENT_SLUGS,
  evaluateMotivationalAchievementsForSessionAttempt,
  seedMotivationalAchievementDefinitions,
} = require("../src/services/motivationalAchievements");

function makeAttempt({
  id,
  patientSessionId = "session-1",
  sessionScore,
  badgeTier = "NONE",
  scoredAt,
}) {
  return {
    id,
    userId: "user-1",
    patientSessionId,
    status: "SCORED",
    sessionScore,
    badgeTier,
    scoredAt,
    submittedAt: scoredAt,
    startedAt: scoredAt,
  };
}

function makeCurrentAttempt(overrides = {}) {
  return {
    ...makeAttempt({
      id: "current-attempt",
      patientSessionId: "session-1",
      sessionScore: 90,
      badgeTier: "GOLD",
      scoredAt: "2026-06-24T12:00:00.000Z",
    }),
    patientSession: {
      id: "session-1",
      unit: {
        id: "unit-1",
        sessions: [{ id: "session-1" }, { id: "session-2" }],
        learningPath: {
          id: "path-1",
          slug: "clinical-encounter-foundations",
          units: [
            {
              id: "unit-1",
              sessions: [{ id: "session-1" }, { id: "session-2" }],
            },
            {
              id: "unit-2",
              sessions: [{ id: "session-3" }],
            },
          ],
        },
      },
    },
    ...overrides,
  };
}

function makeEvaluatorClient({
  currentAttempt = makeCurrentAttempt(),
  scoredAttempts = [currentAttempt],
  hpiSummaryCount = 0,
  existingProgress = [],
} = {}) {
  const definitions = MOTIVATIONAL_ACHIEVEMENT_DEFINITIONS.map((definition) => ({
    id: `${definition.slug}-id`,
    ...definition,
    active: true,
  }));
  const progressStore = new Map(
    existingProgress.map((progress) => [
      `${progress.userId}:${progress.motivationalAchievementId}`,
      { ...progress },
    ])
  );
  const calls = {
    badgeAward: [],
    userMotivationalAchievementUpsert: [],
  };

  return {
    calls,
    progressStore,
    sessionAttempt: {
      findUnique: async () => currentAttempt,
      findMany: async () => scoredAttempts,
    },
    achievementResult: {
      findMany: async () =>
        Array.from({ length: hpiSummaryCount }, (_, index) => ({ id: `hpi-result-${index}` })),
    },
    motivationalAchievement: {
      findMany: async (args) => {
        const slugs = args?.where?.slug?.in || EVALUATED_ACHIEVEMENT_SLUGS;
        return definitions.filter((definition) => slugs.includes(definition.slug));
      },
    },
    userMotivationalAchievement: {
      findMany: async (args) => {
        const ids = new Set(args?.where?.motivationalAchievementId?.in || []);
        return Array.from(progressStore.values()).filter(
          (progress) => progress.userId === args.where.userId && ids.has(progress.motivationalAchievementId)
        );
      },
      upsert: async (args) => {
        calls.userMotivationalAchievementUpsert.push(args);
        const key = `${args.where.userId_motivationalAchievementId.userId}:${args.where.userId_motivationalAchievementId.motivationalAchievementId}`;
        const current = progressStore.get(key);
        const saved = {
          id: current?.id || `${key}-progress`,
          ...(current ? args.update : args.create),
        };
        progressStore.set(key, saved);
        return saved;
      },
    },
    badgeAward: {
      upsert: async (args) => {
        calls.badgeAward.push(args);
        throw new Error("motivational evaluator must not touch BadgeAward");
      },
    },
  };
}

function findProgress(result, slug) {
  return result.evaluated.find((progress) => progress.slug === slug);
}

test("motivational achievement definitions seed idempotently with upsert", async () => {
  const calls = [];
  const fakeClient = {
    motivationalAchievement: {
      upsert: async (args) => {
        calls.push(args);
        return { id: `${args.where.slug}-id`, ...args.create };
      },
    },
  };

  await seedMotivationalAchievementDefinitions(fakeClient);
  await seedMotivationalAchievementDefinitions(fakeClient);

  assert.equal(MOTIVATIONAL_ACHIEVEMENT_DEFINITIONS.length, 8);
  assert.equal(calls.length, MOTIVATIONAL_ACHIEVEMENT_DEFINITIONS.length * 2);
  assert.deepEqual(
    calls.slice(0, 8).map((call) => call.where.slug),
    [
      "streak-3-day",
      "streak-7-day",
      "first-gold-badge",
      "comeback-20-point-improvement",
      "hpi-builder",
      "gold-streak-3",
      "unit-complete",
      "clinical-foundations-complete",
    ]
  );

  for (const call of calls) {
    assert.equal(call.create.slug, call.where.slug);
    assert.equal(call.create.title, call.update.title);
    assert.equal(call.create.category, call.update.category);
    assert.equal(call.create.xpReward, call.update.xpReward);
    assert.equal(call.create.targetValue, call.update.targetValue);
    assert.equal(call.create.active, true);
  }
});

test("BadgeAward remains dedicated to session performance badges", () => {
  const schemaPath = path.resolve(__dirname, "../prisma/schema.prisma");
  const schema = fs.readFileSync(schemaPath, "utf8");
  const badgeAwardModel = schema.match(/model BadgeAward \{[\s\S]*?\n\}/)?.[0] || "";

  assert.ok(badgeAwardModel.includes("patientSessionId String"));
  assert.ok(badgeAwardModel.includes("sessionAttemptId String"));
  assert.ok(badgeAwardModel.includes("tier             BadgeTier"));
  assert.ok(badgeAwardModel.includes("@@unique([userId, patientSessionId, sessionAttemptId])"));
  assert.ok(!badgeAwardModel.includes("MotivationalAchievement"));
});

test("first-gold-badge earns when user has a gold attempt", async () => {
  const client = makeEvaluatorClient({
    scoredAttempts: [
      makeAttempt({
        id: "current-attempt",
        sessionScore: 90,
        badgeTier: "GOLD",
        scoredAt: "2026-06-24T12:00:00.000Z",
      }),
    ],
  });

  const result = await evaluateMotivationalAchievementsForSessionAttempt({
    userId: "user-1",
    sessionAttemptId: "current-attempt",
    client,
  });

  assert.equal(findProgress(result, "first-gold-badge").status, "EARNED");
  assert.equal(findProgress(result, "first-gold-badge").currentValue, 1);
  assert.ok(result.newlyEarned.some((item) => item.slug === "first-gold-badge"));
});

test("first-gold-badge remains earned on repeat evaluation", async () => {
  const earnedAt = new Date("2026-06-20T10:00:00.000Z");
  const client = makeEvaluatorClient({
    scoredAttempts: [
      makeAttempt({
        id: "current-attempt",
        sessionScore: 90,
        badgeTier: "GOLD",
        scoredAt: "2026-06-24T12:00:00.000Z",
      }),
    ],
    existingProgress: [
      {
        id: "existing-progress",
        userId: "user-1",
        motivationalAchievementId: "first-gold-badge-id",
        status: "EARNED",
        currentValue: 1,
        targetValue: 1,
        earnedAt,
      },
    ],
  });

  const result = await evaluateMotivationalAchievementsForSessionAttempt({
    userId: "user-1",
    sessionAttemptId: "current-attempt",
    client,
  });

  const progress = findProgress(result, "first-gold-badge");
  assert.equal(progress.status, "EARNED");
  assert.equal(progress.earnedAt, earnedAt);
  assert.ok(!result.newlyEarned.some((item) => item.slug === "first-gold-badge"));
});

test("comeback earns when current score improves by 20+", async () => {
  const currentAttempt = makeCurrentAttempt({
    id: "current-attempt",
    patientSessionId: "session-1",
    sessionScore: 91,
    badgeTier: "GOLD",
  });
  const client = makeEvaluatorClient({
    currentAttempt,
    scoredAttempts: [
      currentAttempt,
      makeAttempt({
        id: "prior-attempt",
        patientSessionId: "session-1",
        sessionScore: 65,
        badgeTier: "SILVER",
        scoredAt: "2026-06-21T12:00:00.000Z",
      }),
    ],
  });

  const result = await evaluateMotivationalAchievementsForSessionAttempt({
    userId: "user-1",
    sessionAttemptId: "current-attempt",
    client,
  });

  const progress = findProgress(result, "comeback-20-point-improvement");
  assert.equal(progress.status, "EARNED");
  assert.equal(progress.currentValue, 26);
});

test("comeback does not earn below 20 improvement", async () => {
  const currentAttempt = makeCurrentAttempt({
    id: "current-attempt",
    patientSessionId: "session-1",
    sessionScore: 82,
    badgeTier: "SILVER",
  });
  const client = makeEvaluatorClient({
    currentAttempt,
    scoredAttempts: [
      currentAttempt,
      makeAttempt({
        id: "prior-attempt",
        patientSessionId: "session-1",
        sessionScore: 70,
        badgeTier: "SILVER",
        scoredAt: "2026-06-21T12:00:00.000Z",
      }),
    ],
  });

  const result = await evaluateMotivationalAchievementsForSessionAttempt({
    userId: "user-1",
    sessionAttemptId: "current-attempt",
    client,
  });

  const progress = findProgress(result, "comeback-20-point-improvement");
  assert.equal(progress.status, "IN_PROGRESS");
  assert.equal(progress.currentValue, 12);
});

test("hpi-builder counts achieved hpi-summary results", async () => {
  const client = makeEvaluatorClient({ hpiSummaryCount: 3 });

  const result = await evaluateMotivationalAchievementsForSessionAttempt({
    userId: "user-1",
    sessionAttemptId: "current-attempt",
    client,
  });

  const progress = findProgress(result, "hpi-builder");
  assert.equal(progress.status, "EARNED");
  assert.equal(progress.currentValue, 3);
});

test("gold-streak-3 counts consecutive gold attempts", async () => {
  const currentAttempt = makeCurrentAttempt({
    id: "current-attempt",
    sessionScore: 95,
    badgeTier: "GOLD",
    scoredAt: "2026-06-24T12:00:00.000Z",
  });
  const client = makeEvaluatorClient({
    currentAttempt,
    scoredAttempts: [
      currentAttempt,
      makeAttempt({
        id: "gold-2",
        patientSessionId: "session-2",
        sessionScore: 90,
        badgeTier: "GOLD",
        scoredAt: "2026-06-23T12:00:00.000Z",
      }),
      makeAttempt({
        id: "gold-3",
        patientSessionId: "session-3",
        sessionScore: 88,
        badgeTier: "GOLD",
        scoredAt: "2026-06-22T12:00:00.000Z",
      }),
      makeAttempt({
        id: "silver-older",
        patientSessionId: "session-1",
        sessionScore: 70,
        badgeTier: "SILVER",
        scoredAt: "2026-06-21T12:00:00.000Z",
      }),
    ],
  });

  const result = await evaluateMotivationalAchievementsForSessionAttempt({
    userId: "user-1",
    sessionAttemptId: "current-attempt",
    client,
  });

  const progress = findProgress(result, "gold-streak-3");
  assert.equal(progress.status, "EARNED");
  assert.equal(progress.currentValue, 3);
});

test("unit-complete requires all sessions in current unit best score >= 84", async () => {
  const currentAttempt = makeCurrentAttempt({
    id: "current-attempt",
    patientSessionId: "session-1",
    sessionScore: 90,
    badgeTier: "GOLD",
  });
  const client = makeEvaluatorClient({
    currentAttempt,
    scoredAttempts: [
      currentAttempt,
      makeAttempt({
        id: "unit-session-2",
        patientSessionId: "session-2",
        sessionScore: 84,
        badgeTier: "GOLD",
        scoredAt: "2026-06-23T12:00:00.000Z",
      }),
      makeAttempt({
        id: "path-session-3-low",
        patientSessionId: "session-3",
        sessionScore: 70,
        badgeTier: "SILVER",
        scoredAt: "2026-06-22T12:00:00.000Z",
      }),
    ],
  });

  const result = await evaluateMotivationalAchievementsForSessionAttempt({
    userId: "user-1",
    sessionAttemptId: "current-attempt",
    client,
  });

  const progress = findProgress(result, "unit-complete");
  assert.equal(progress.status, "EARNED");
  assert.equal(progress.currentValue, 2);
  assert.equal(progress.targetValue, 2);
});

test("clinical-foundations-complete requires all path sessions best score >= 84", async () => {
  const currentAttempt = makeCurrentAttempt({
    id: "current-attempt",
    patientSessionId: "session-1",
    sessionScore: 90,
    badgeTier: "GOLD",
  });
  const client = makeEvaluatorClient({
    currentAttempt,
    scoredAttempts: [
      currentAttempt,
      makeAttempt({
        id: "unit-session-2",
        patientSessionId: "session-2",
        sessionScore: 84,
        badgeTier: "GOLD",
        scoredAt: "2026-06-23T12:00:00.000Z",
      }),
      makeAttempt({
        id: "path-session-3",
        patientSessionId: "session-3",
        sessionScore: 88,
        badgeTier: "GOLD",
        scoredAt: "2026-06-22T12:00:00.000Z",
      }),
    ],
  });

  const result = await evaluateMotivationalAchievementsForSessionAttempt({
    userId: "user-1",
    sessionAttemptId: "current-attempt",
    client,
  });

  const progress = findProgress(result, "clinical-foundations-complete");
  assert.equal(progress.status, "EARNED");
  assert.equal(progress.currentValue, 3);
  assert.equal(progress.targetValue, 3);
});

test("evaluator preserves earnedAt for already earned achievement", async () => {
  const earnedAt = new Date("2026-06-20T10:00:00.000Z");
  const client = makeEvaluatorClient({
    hpiSummaryCount: 4,
    existingProgress: [
      {
        id: "existing-hpi-builder",
        userId: "user-1",
        motivationalAchievementId: "hpi-builder-id",
        status: "EARNED",
        currentValue: 3,
        targetValue: 3,
        earnedAt,
      },
    ],
  });

  const result = await evaluateMotivationalAchievementsForSessionAttempt({
    userId: "user-1",
    sessionAttemptId: "current-attempt",
    client,
  });

  const progress = findProgress(result, "hpi-builder");
  assert.equal(progress.status, "EARNED");
  assert.equal(progress.currentValue, 4);
  assert.equal(progress.earnedAt, earnedAt);
});

test("evaluator does not create or modify BadgeAward", async () => {
  const client = makeEvaluatorClient();

  await evaluateMotivationalAchievementsForSessionAttempt({
    userId: "user-1",
    sessionAttemptId: "current-attempt",
    client,
  });

  assert.deepEqual(client.calls.badgeAward, []);
});

test("finalizeSessionAttemptFromSubmission calls evaluator after scoring finalization", () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, "../src/services/sessionAttempts.js"),
    "utf8"
  );
  const transactionIndex = source.indexOf("await prisma.$transaction");
  const evaluatorIndex = source.indexOf(
    "const motivationalAchievements = await evaluateMotivationalAchievementsForSessionAttempt"
  );

  assert.ok(transactionIndex > -1);
  assert.ok(evaluatorIndex > transactionIndex);
});
