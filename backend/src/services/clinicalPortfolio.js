const prisma = require("../db/prisma");

const CLINICAL_FOUNDATIONS_SLUG = "clinical-encounter-foundations";
const CORE_COMPETENCY_SLUGS = [
  "formal-introduction",
  "chief-complaint",
  "hpi-summary",
];

function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sortByOrderAndTitle(a, b) {
  const orderDiff = (a.sortOrder || 0) - (b.sortOrder || 0);
  if (orderDiff !== 0) return orderDiff;
  return String(a.title || "").localeCompare(String(b.title || ""));
}

function professionalLevelTitle(level) {
  if (level <= 1) return "Student Clinician";
  if (level === 2) return "Emerging Interviewer";
  if (level === 3) return "Clinical Communicator";
  if (level === 4) return "Clinical Historian";
  return "Developing Clinician";
}

function nextLevelXpFor(level) {
  // Existing UserProgress level progression is floor(points / 100) + 1.
  return Math.max(1, toFiniteNumber(level, 1)) * 100;
}

function bestSessionScore(session) {
  return (session.attempts || []).reduce((best, attempt) => {
    const score = toFiniteNumber(attempt.sessionScore, NaN);
    if (!Number.isFinite(score)) return best;
    return best == null || score > best ? score : best;
  }, null);
}

function buildIdentity({ user, progress }) {
  const professionalLevel = Math.max(1, toFiniteNumber(progress?.level, 1));

  return {
    displayName: user?.name || user?.email || "Student Clinician",
    professionalLevel,
    levelTitle: professionalLevelTitle(professionalLevel),
    xp: Math.max(0, toFiniteNumber(progress?.xp, 0)),
    nextLevelXp: nextLevelXpFor(professionalLevel),
  };
}

function buildStreak(streak) {
  if (!streak) {
    return {
      currentCount: 0,
      longestCount: 0,
      lastActivityDate: null,
      status: "START",
    };
  }

  const currentCount = Math.max(0, toFiniteNumber(streak.currentCount, 0));

  return {
    currentCount,
    longestCount: Math.max(0, toFiniteNumber(streak.longestCount, 0)),
    lastActivityDate: streak.lastActivityDate || null,
    status: currentCount > 0 ? "ACTIVE" : "START",
  };
}

function buildLearningPathProgress(path) {
  if (!path) {
    return {
      pathTitle: null,
      completedSessions: 0,
      totalSessions: 0,
      percentComplete: 0,
      currentUnit: null,
      currentSession: null,
    };
  }

  const units = (path.units || []).sort(sortByOrderAndTitle);
  const sessions = units.flatMap((unit) =>
    (unit.sessions || []).sort(sortByOrderAndTitle).map((session) => ({
      ...session,
      unit,
      bestScore: bestSessionScore(session),
    }))
  );
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter((session) => toFiniteNumber(session.bestScore, -1) >= 84).length;
  const current = sessions.find((session) => toFiniteNumber(session.bestScore, -1) < 84) || null;

  return {
    pathTitle: path.title,
    completedSessions,
    totalSessions,
    percentComplete:
      totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0,
    currentUnit: current
      ? {
          id: current.unit.id,
          slug: current.unit.slug,
          title: current.unit.title,
          sortOrder: current.unit.sortOrder,
        }
      : null,
    currentSession: current
      ? {
          id: current.id,
          slug: current.slug,
          title: current.title,
          bestSessionScore: current.bestScore,
        }
      : null,
  };
}

function buildMilestones(definitions) {
  return (definitions || []).map((definition) => {
    const progress = definition.userAchievements?.[0] || null;

    return {
      slug: definition.slug,
      title: definition.title,
      description: definition.description || null,
      category: definition.category,
      icon: definition.icon || null,
      status: progress?.status || "LOCKED",
      currentValue: progress?.currentValue ?? 0,
      targetValue: progress?.targetValue ?? definition.targetValue ?? null,
      earnedAt: progress?.earnedAt || null,
    };
  });
}

function buildCompetencies(results) {
  const groups = new Map(
    CORE_COMPETENCY_SLUGS.map((slug) => [
      slug,
      {
        slug,
        title: slug
          .split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" "),
        rows: [],
      },
    ])
  );

  for (const result of results || []) {
    const achievement = result.achievement;
    if (!achievement?.slug || !groups.has(achievement.slug)) continue;

    const group = groups.get(achievement.slug);
    group.title = achievement.title || group.title;
    group.rows.push(result);
  }

  return Array.from(groups.values()).map((group) => {
    const sorted = [...group.rows].sort((a, b) => {
      const aTime = new Date(a.sessionAttempt?.scoredAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.sessionAttempt?.scoredAt || b.createdAt || 0).getTime();
      return bTime - aTime;
    });
    const scores = sorted
      .map((row) => toFiniteNumber(row.percentScore, NaN))
      .filter(Number.isFinite);

    return {
      slug: group.slug,
      title: group.title,
      attempts: group.rows.length,
      achievedCount: group.rows.filter((row) => row.achieved).length,
      bestPercentScore: scores.length ? Math.max(...scores) : null,
      latestPercentScore: scores.length ? scores[0] : null,
    };
  });
}

function buildRecentPatients(attempts) {
  return (attempts || []).map((attempt) => ({
    sessionAttemptId: attempt.id,
    patientSessionTitle: attempt.patientSession?.title || null,
    caseTitle: attempt.patientSession?.patientCase?.title || null,
    caseId: attempt.patientSession?.patientCase?.caseId || null,
    sessionScore: attempt.sessionScore,
    badgeTier: attempt.badgeTier || null,
    passed: attempt.passed,
    scoredAt: attempt.scoredAt || null,
  }));
}

async function buildClinicalPortfolio({ userId, client = prisma }) {
  const [user, learningPath, definitions, competencyResults, recentAttempts] = await Promise.all([
    client.user.findUnique({
      where: { id: userId },
      include: {
        progress: true,
        streak: true,
      },
    }),
    client.learningPath.findUnique({
      where: { slug: CLINICAL_FOUNDATIONS_SLUG },
      include: {
        units: {
          where: { active: true },
          include: {
            sessions: {
              where: { active: true },
              include: {
                attempts: {
                  where: {
                    userId,
                    status: "SCORED",
                    sessionScore: {
                      not: null,
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
    client.motivationalAchievement.findMany({
      where: { active: true },
      include: {
        userAchievements: {
          where: { userId },
        },
      },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    }),
    client.achievementResult.findMany({
      where: {
        achievement: {
          slug: {
            in: CORE_COMPETENCY_SLUGS,
          },
        },
        sessionAttempt: {
          userId,
          status: "SCORED",
        },
      },
      include: {
        achievement: true,
        sessionAttempt: {
          select: {
            scoredAt: true,
          },
        },
      },
    }),
    client.sessionAttempt.findMany({
      where: {
        userId,
        status: "SCORED",
        sessionScore: {
          not: null,
        },
      },
      include: {
        patientSession: {
          include: {
            patientCase: true,
          },
        },
      },
      orderBy: [{ scoredAt: "desc" }, { submittedAt: "desc" }, { startedAt: "desc" }],
      take: 5,
    }),
  ]);

  return {
    identity: buildIdentity({ user, progress: user?.progress }),
    streak: buildStreak(user?.streak),
    learningPathProgress: buildLearningPathProgress(learningPath),
    milestones: buildMilestones(definitions),
    competencies: buildCompetencies(competencyResults),
    professionalQualities: [],
    mentorCommendations: [],
    recentPatients: buildRecentPatients(recentAttempts),
  };
}

module.exports = {
  buildClinicalPortfolio,
  buildCompetencies,
  buildLearningPathProgress,
  buildMilestones,
  buildRecentPatients,
  professionalLevelTitle,
};
