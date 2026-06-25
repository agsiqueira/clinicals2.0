const prisma = require("../db/prisma");

const EVALUATED_ACHIEVEMENT_SLUGS = [
  "first-gold-badge",
  "comeback-20-point-improvement",
  "hpi-builder",
  "gold-streak-3",
  "unit-complete",
  "clinical-foundations-complete",
];

const MOTIVATIONAL_ACHIEVEMENT_DEFINITIONS = [
  {
    slug: "streak-3-day",
    title: "3-Day Streak",
    category: "streak",
    icon: "🔥",
    targetValue: 3,
    xpReward: 25,
    sortOrder: 1,
  },
  {
    slug: "streak-7-day",
    title: "7-Day Streak",
    category: "streak",
    icon: "🔥",
    targetValue: 7,
    xpReward: 75,
    sortOrder: 2,
  },
  {
    slug: "first-gold-badge",
    title: "First Gold Badge",
    category: "milestone",
    icon: "🥇",
    targetValue: 1,
    xpReward: 50,
    sortOrder: 3,
  },
  {
    slug: "comeback-20-point-improvement",
    title: "Comeback Clinician",
    category: "improvement",
    icon: "📈",
    targetValue: 20,
    xpReward: 50,
    sortOrder: 4,
  },
  {
    slug: "hpi-builder",
    title: "HPI Builder",
    category: "competency",
    icon: "📝",
    targetValue: 3,
    xpReward: 75,
    sortOrder: 5,
  },
  {
    slug: "gold-streak-3",
    title: "Gold Streak",
    category: "mastery",
    icon: "🥇",
    targetValue: 3,
    xpReward: 100,
    sortOrder: 6,
  },
  {
    slug: "unit-complete",
    title: "Unit Complete",
    category: "progression",
    icon: "✅",
    targetValue: 1,
    xpReward: 50,
    sortOrder: 7,
  },
  {
    slug: "clinical-foundations-complete",
    title: "Clinical Foundations Complete",
    category: "progression",
    icon: "🏆",
    targetValue: 1,
    xpReward: 150,
    sortOrder: 8,
  },
];

function buildMotivationalAchievementUpsert(definition) {
  const data = {
    title: definition.title,
    description: definition.description || null,
    category: definition.category,
    icon: definition.icon || null,
    xpReward: definition.xpReward || 0,
    targetValue: definition.targetValue ?? null,
    active: definition.active ?? true,
    sortOrder: definition.sortOrder || 0,
    criteria: definition.criteria || null,
  };

  return {
    where: { slug: definition.slug },
    create: {
      slug: definition.slug,
      ...data,
    },
    update: data,
  };
}

async function seedMotivationalAchievementDefinitions(client = prisma) {
  const results = [];

  for (const definition of MOTIVATIONAL_ACHIEVEMENT_DEFINITIONS) {
    results.push(
      await client.motivationalAchievement.upsert(
        buildMotivationalAchievementUpsert(definition)
      )
    );
  }

  return results;
}

function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function scoredAttemptTime(attempt) {
  return new Date(attempt?.scoredAt || attempt?.submittedAt || attempt?.startedAt || 0).getTime();
}

function sortScoredAttemptsDesc(attempts) {
  return [...(attempts || [])].sort((a, b) => scoredAttemptTime(b) - scoredAttemptTime(a));
}

function bestScoreByPatientSession(attempts) {
  const bestBySession = new Map();

  for (const attempt of attempts || []) {
    const patientSessionId = attempt.patientSessionId;
    if (!patientSessionId) continue;

    const score = toFiniteNumber(attempt.sessionScore, NaN);
    if (!Number.isFinite(score)) continue;

    const currentBest = bestBySession.get(patientSessionId);
    if (currentBest == null || score > currentBest) {
      bestBySession.set(patientSessionId, score);
    }
  }

  return bestBySession;
}

function countSessionsCompletedAtThreshold(sessions, bestBySession, threshold = 84) {
  return (sessions || []).filter((session) => {
    const score = bestBySession.get(session.id);
    return toFiniteNumber(score, -1) >= threshold;
  }).length;
}

function currentGoldStreak(attempts) {
  let count = 0;

  for (const attempt of sortScoredAttemptsDesc(attempts)) {
    if (attempt.badgeTier !== "GOLD") break;
    count += 1;
  }

  return count;
}

function computeStatus({ currentValue, targetValue, existingStatus }) {
  if (existingStatus === "EARNED") return "EARNED";
  if (targetValue != null && currentValue >= targetValue) return "EARNED";
  if (currentValue > 0) return "IN_PROGRESS";
  return "LOCKED";
}

function buildProgressEvaluation({ slug, currentValue, targetValue, metadata }) {
  const normalizedCurrentValue = Math.max(0, Math.floor(toFiniteNumber(currentValue)));

  return {
    slug,
    currentValue: normalizedCurrentValue,
    targetValue,
    metadata: metadata || null,
  };
}

async function loadEvaluationContext({ userId, sessionAttemptId, client }) {
  const currentAttempt = await client.sessionAttempt.findUnique({
    where: { id: sessionAttemptId },
    include: {
      patientSession: {
        include: {
          unit: {
            include: {
              sessions: {
                where: { active: true },
              },
              learningPath: {
                include: {
                  units: {
                    where: { active: true },
                    include: {
                      sessions: {
                        where: { active: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!currentAttempt) return null;

  const scoredAttempts = await client.sessionAttempt.findMany({
    where: {
      userId,
      status: "SCORED",
      sessionScore: {
        not: null,
      },
    },
    include: {
      patientSession: true,
    },
    orderBy: [{ scoredAt: "desc" }, { submittedAt: "desc" }, { startedAt: "desc" }],
  });

  const hpiResults = await client.achievementResult.findMany({
    where: {
      achieved: true,
      sessionAttempt: {
        userId,
        status: "SCORED",
      },
      achievement: {
        slug: "hpi-summary",
      },
    },
    select: {
      id: true,
    },
  });

  return {
    currentAttempt,
    scoredAttempts,
    hpiSummaryCount: hpiResults.length,
  };
}

function evaluateProgressForContext({ currentAttempt, scoredAttempts, hpiSummaryCount }) {
  const bestBySession = bestScoreByPatientSession(scoredAttempts);
  const currentScore = toFiniteNumber(currentAttempt.sessionScore, 0);
  const priorSameSessionAttempts = (scoredAttempts || []).filter(
    (attempt) =>
      attempt.id !== currentAttempt.id &&
      attempt.patientSessionId === currentAttempt.patientSessionId
  );
  const bestImprovement = priorSameSessionAttempts.reduce((best, attempt) => {
    const improvement = currentScore - toFiniteNumber(attempt.sessionScore, currentScore);
    return Math.max(best, improvement);
  }, 0);
  const unitSessions = currentAttempt.patientSession?.unit?.sessions || [];
  const pathSessions = (currentAttempt.patientSession?.unit?.learningPath?.units || []).flatMap(
    (unit) => unit.sessions || []
  );
  const unitCompletedCount = countSessionsCompletedAtThreshold(unitSessions, bestBySession);
  const pathCompletedCount = countSessionsCompletedAtThreshold(pathSessions, bestBySession);

  return [
    buildProgressEvaluation({
      slug: "first-gold-badge",
      currentValue: scoredAttempts.some((attempt) => attempt.badgeTier === "GOLD") ? 1 : 0,
      targetValue: 1,
    }),
    buildProgressEvaluation({
      slug: "comeback-20-point-improvement",
      currentValue: bestImprovement,
      targetValue: 20,
      metadata: {
        patientSessionId: currentAttempt.patientSessionId,
        currentSessionAttemptId: currentAttempt.id,
      },
    }),
    buildProgressEvaluation({
      slug: "hpi-builder",
      currentValue: hpiSummaryCount,
      targetValue: 3,
    }),
    buildProgressEvaluation({
      slug: "gold-streak-3",
      currentValue: Math.min(currentGoldStreak(scoredAttempts), 3),
      targetValue: 3,
    }),
    buildProgressEvaluation({
      slug: "unit-complete",
      currentValue: unitCompletedCount,
      targetValue: unitSessions.length,
      metadata: {
        unitId: currentAttempt.patientSession?.unit?.id || null,
      },
    }),
    buildProgressEvaluation({
      slug: "clinical-foundations-complete",
      currentValue: pathCompletedCount,
      targetValue: pathSessions.length,
      metadata: {
        learningPathId: currentAttempt.patientSession?.unit?.learningPath?.id || null,
      },
    }),
  ];
}

async function evaluateMotivationalAchievementsForSessionAttempt({
  userId,
  sessionAttemptId,
  client = prisma,
}) {
  if (!userId || !sessionAttemptId) {
    return {
      evaluated: [],
      newlyEarned: [],
      updatedProgress: [],
    };
  }

  const context = await loadEvaluationContext({ userId, sessionAttemptId, client });
  if (!context) {
    return {
      evaluated: [],
      newlyEarned: [],
      updatedProgress: [],
    };
  }

  const definitions = await client.motivationalAchievement.findMany({
    where: {
      slug: {
        in: EVALUATED_ACHIEVEMENT_SLUGS,
      },
      active: true,
    },
  });
  const definitionsBySlug = new Map(definitions.map((definition) => [definition.slug, definition]));
  const existingProgress = await client.userMotivationalAchievement.findMany({
    where: {
      userId,
      motivationalAchievementId: {
        in: definitions.map((definition) => definition.id),
      },
    },
  });
  const existingByAchievementId = new Map(
    existingProgress.map((progress) => [progress.motivationalAchievementId, progress])
  );

  const evaluated = [];
  const newlyEarned = [];
  const updatedProgress = [];
  const now = new Date();

  for (const progressEvaluation of evaluateProgressForContext(context)) {
    const definition = definitionsBySlug.get(progressEvaluation.slug);
    if (!definition) continue;

    const existing = existingByAchievementId.get(definition.id);
    const targetValue = progressEvaluation.targetValue ?? definition.targetValue ?? null;
    const computedStatus = computeStatus({
      currentValue: progressEvaluation.currentValue,
      targetValue,
      existingStatus: existing?.status,
    });
    const earnedAt =
      existing?.earnedAt || (computedStatus === "EARNED" ? now : null);
    const wasAlreadyEarned = existing?.status === "EARNED";
    const isNewlyEarned = computedStatus === "EARNED" && !wasAlreadyEarned;
    const progressData = {
      status: computedStatus,
      currentValue: progressEvaluation.currentValue,
      targetValue,
      earnedAt,
      lastEvaluatedAt: now,
      metadata: progressEvaluation.metadata,
    };

    const savedProgress = await client.userMotivationalAchievement.upsert({
      where: {
        userId_motivationalAchievementId: {
          userId,
          motivationalAchievementId: definition.id,
        },
      },
      create: {
        userId,
        motivationalAchievementId: definition.id,
        ...progressData,
      },
      update: progressData,
    });

    const summary = {
      slug: definition.slug,
      title: definition.title,
      status: savedProgress.status,
      currentValue: savedProgress.currentValue,
      targetValue: savedProgress.targetValue,
      earnedAt: savedProgress.earnedAt,
    };

    evaluated.push(summary);
    updatedProgress.push(savedProgress);
    if (isNewlyEarned) newlyEarned.push(summary);
  }

  return {
    evaluated,
    newlyEarned,
    updatedProgress,
  };
}

module.exports = {
  EVALUATED_ACHIEVEMENT_SLUGS,
  MOTIVATIONAL_ACHIEVEMENT_DEFINITIONS,
  buildMotivationalAchievementUpsert,
  evaluateMotivationalAchievementsForSessionAttempt,
  evaluateProgressForContext,
  seedMotivationalAchievementDefinitions,
};
