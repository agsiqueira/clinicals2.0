const prisma = require("../db/prisma");
const { buildCompetencyEvidence, getCompetencies } = require("./competencyEngine");

function toFiniteNumber(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function attemptTimestamp(attempt) {
  return attempt?.scoredAt || attempt?.submittedAt || attempt?.startedAt || null;
}

function evidenceScore(item) {
  if (item.percentScore != null) {
    return Math.max(0, Math.min(100, toFiniteNumber(item.percentScore, 0)));
  }
  return item.achieved ? 100 : 0;
}

function weightedAverageScore(evidenceItems) {
  let weightedSum = 0;
  let totalWeight = 0;

  (evidenceItems || []).forEach((item) => {
    const weight = Number(item.weight) || 0;
    if (weight <= 0) return;
    weightedSum += evidenceScore(item) * weight;
    totalWeight += weight;
  });

  if (totalWeight <= 0) return null;
  return Math.round(weightedSum / totalWeight);
}

function computeCompetencyTrend(attemptScores) {
  const scores = (attemptScores || []).filter((score) => score != null);
  if (scores.length < 2) return "INSUFFICIENT_DATA";

  const delta = scores[scores.length - 1] - scores[0];
  if (delta >= 5) return "IMPROVING";
  if (delta <= -5) return "NEEDS_PRACTICE";
  return "STABLE";
}

function buildAttemptEvaluationPayload(attempt) {
  const results = attempt.achievementResults || [];
  const objectives = results
    .map((result) => {
      const achievement = result.achievement;
      if (!achievement) return null;
      return { id: achievement.id, slug: achievement.slug };
    })
    .filter(Boolean);

  const evaluatedObjectives = results.map((result) => ({
    achievementId: result.achievementId,
    objectiveId: result.achievementId,
    objectiveKey: result.achievement?.slug,
    achieved: Boolean(result.achieved),
    percentScore: result.percentScore,
  }));

  return { objectives, evaluatedObjectives };
}

function buildCompetencyProfiles({ attempts, evidence }) {
  const evidenceByCompetency = new Map();
  (evidence || []).forEach((item) => {
    const items = evidenceByCompetency.get(item.competencyId) || [];
    items.push(item);
    evidenceByCompetency.set(item.competencyId, items);
  });

  return getCompetencies().map((definition) => {
    const items = evidenceByCompetency.get(definition.id) || [];
    const currentScore = weightedAverageScore(items);

    const byAttempt = new Map();
    items.forEach((item) => {
      const attemptItems = byAttempt.get(item.attemptId) || [];
      attemptItems.push(item);
      byAttempt.set(item.attemptId, attemptItems);
    });

    const attemptScores = (attempts || [])
      .map((attempt) => weightedAverageScore(byAttempt.get(attempt.id) || []))
      .filter((score) => score != null);

    return {
      id: definition.id,
      name: definition.name,
      description: definition.description,
      currentScore,
      trend: computeCompetencyTrend(attemptScores),
      evidenceCount: items.length,
    };
  });
}

function buildGrowthSummary(competencies, completedSessions) {
  const scored = (competencies || []).filter((competency) => competency.currentScore != null);
  const strongestCompetency = scored.length
    ? [...scored].sort((a, b) => b.currentScore - a.currentScore)[0]
    : null;
  const needsMostPractice = scored.length
    ? [...scored].sort((a, b) => a.currentScore - b.currentScore)[0]
    : null;
  const overallCompetencyScore = scored.length
    ? Math.round(scored.reduce((sum, competency) => sum + competency.currentScore, 0) / scored.length)
    : null;

  return {
    strongestCompetency: strongestCompetency
      ? {
          id: strongestCompetency.id,
          name: strongestCompetency.name,
          currentScore: strongestCompetency.currentScore,
        }
      : null,
    needsMostPractice: needsMostPractice
      ? {
          id: needsMostPractice.id,
          name: needsMostPractice.name,
          currentScore: needsMostPractice.currentScore,
        }
      : null,
    overallCompetencyScore,
    completedSessions,
  };
}

async function buildStudentCompetencyProfile({ userId, client = prisma }) {
  const [user, attempts] = await Promise.all([
    client.user.findUnique({ where: { id: userId } }),
    client.sessionAttempt.findMany({
      where: {
        userId,
        status: "SCORED",
        sessionScore: { not: null },
      },
      include: {
        achievementResults: { include: { achievement: true } },
        patientSession: true,
      },
      orderBy: [{ scoredAt: "asc" }, { submittedAt: "asc" }, { startedAt: "asc" }],
    }),
  ]);

  const evidence = attempts.flatMap((attempt) => {
    const { objectives, evaluatedObjectives } = buildAttemptEvaluationPayload(attempt);
    return buildCompetencyEvidence({
      studentId: userId,
      sessionId: attempt.patientSessionId,
      attemptId: attempt.id,
      evaluatedObjectives,
      objectives,
      timestamp: attemptTimestamp(attempt),
    });
  });

  const competencies = buildCompetencyProfiles({ attempts, evidence });
  const completedSessions = new Set(attempts.map((attempt) => attempt.patientSessionId)).size;
  const sessionScores = attempts
    .map((attempt) => toFiniteNumber(attempt.sessionScore))
    .filter(Number.isFinite);
  const averageScore = sessionScores.length
    ? Math.round(sessionScores.reduce((sum, score) => sum + score, 0) / sessionScores.length)
    : null;

  return {
    student: {
      displayName: user?.name || user?.email || "Student Clinician",
    },
    summary: {
      completedSessions,
      totalAttempts: attempts.length,
      averageScore,
    },
    competencies,
    growthSummary: buildGrowthSummary(competencies, completedSessions),
  };
}

module.exports = {
  buildAttemptEvaluationPayload,
  buildCompetencyProfiles,
  buildGrowthSummary,
  buildStudentCompetencyProfile,
  computeCompetencyTrend,
  weightedAverageScore,
};
