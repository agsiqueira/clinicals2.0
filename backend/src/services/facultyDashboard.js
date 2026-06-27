const prisma = require("../db/prisma");
const { buildCsv } = require("../utils/csv");

const RECENT_ACTIVITY_DAYS = 21;
const AT_RISK_SCORE_THRESHOLD = 50;

function scoreValue(value) {
  const score = Number(value);
  return Number.isFinite(score) ? score : null;
}

function attemptTimestamp(attempt) {
  return attempt?.scoredAt || attempt?.submittedAt || attempt?.startedAt || null;
}

function compactUser(user) {
  return {
    id: user.id,
    name: user.name || user.email || "Student",
    email: user.email || null,
    imageUrl: user.imageUrl || null,
  };
}

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function studentAggregationKey(userOrStudent) {
  return userOrStudent?.id || normalizeKey(userOrStudent?.email) || null;
}

function uniqueUsersByStudentKey(users) {
  const byStudent = new Map();
  const emailCounts = (users || []).reduce((counts, user) => {
    const emailKey = normalizeKey(user?.email);
    if (emailKey) counts.set(emailKey, (counts.get(emailKey) || 0) + 1);
    return counts;
  }, new Map());

  (users || []).forEach((user) => {
    const emailKey = normalizeKey(user?.email);
    const key = emailKey && emailCounts.get(emailKey) > 1 ? emailKey : studentAggregationKey(user);
    if (!key || byStudent.has(key)) return;
    byStudent.set(key, user);
  });

  return Array.from(byStudent.values());
}

function mergeAttemptsForStudent({ user, attemptsByUser }) {
  const keys = [user?.id, normalizeKey(user?.email)].filter(Boolean);
  const attemptsById = new Map();

  keys.forEach((key) => {
    (attemptsByUser.get(key) || []).forEach((attempt) => {
      attemptsById.set(attempt.id, attempt);
    });
  });

  return Array.from(attemptsById.values()).sort((a, b) => {
    const aTime = new Date(attemptTimestamp(a) || 0).getTime();
    const bTime = new Date(attemptTimestamp(b) || 0).getTime();
    return bTime - aTime;
  });
}

function normalizeObjectiveTitle(title) {
  return String(title || "Objective").trim().replace(/\s+/g, " ");
}

function objectiveAggregationKey(achievement) {
  return achievement?.slug || normalizeKey(achievement?.title) || achievement?.id || null;
}

function addAttemptToStudentMap(map, attempt) {
  const keys = [attempt.userId, normalizeKey(attempt.user?.email)].filter(Boolean);

  keys.forEach((key) => {
    const attempts = map.get(key) || [];
    attempts.push(attempt);
    map.set(key, attempts);
  });

  return map;
}

function badgeKey(tier) {
  return tier || "NONE";
}

function badgeRank(tier) {
  if (tier === "GOLD") return 3;
  if (tier === "SILVER") return 2;
  if (tier === "BRONZE") return 1;
  return 0;
}

function bestBadgeTier(attempts) {
  return (attempts || []).reduce((best, attempt) => {
    const tier = badgeKey(attempt.badgeTier);
    return badgeRank(tier) > badgeRank(best) ? tier : best;
  }, "NONE");
}

function average(values) {
  const scored = values.map(scoreValue).filter((value) => value != null);
  if (scored.length === 0) return null;
  return Math.round(scored.reduce((sum, value) => sum + value, 0) / scored.length);
}

function median(values) {
  const scored = values
    .map(scoreValue)
    .filter((value) => value != null)
    .sort((a, b) => a - b);
  if (scored.length === 0) return null;
  const middle = Math.floor(scored.length / 2);
  if (scored.length % 2 === 1) return Math.round(scored[middle]);
  return Math.round((scored[middle - 1] + scored[middle]) / 2);
}

function buildScoreDistribution(scoredAttempts) {
  const buckets = [
    { key: "0-49", label: "0-49", min: 0, max: 49, count: 0 },
    { key: "50-69", label: "50-69", min: 50, max: 69, count: 0 },
    { key: "70-83", label: "70-83", min: 70, max: 83, count: 0 },
    { key: "84-100", label: "84-100", min: 84, max: 100, count: 0 },
  ];

  scoredAttempts.forEach((attempt) => {
    const score = scoreValue(attempt.sessionScore);
    if (score == null) return;
    const bucket = buckets.find((item) => score >= item.min && score <= item.max);
    if (bucket) bucket.count += 1;
  });

  return buckets.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    count: bucket.count,
    percent:
      scoredAttempts.length > 0 ? Math.round((bucket.count / scoredAttempts.length) * 100) : 0,
  }));
}

function buildPopulationPerformance({ users, sessions, allAttempts, scoredAttempts, activeStudentIds }) {
  const scores = scoredAttempts.map((attempt) => attempt.sessionScore);
  const highestScore =
    scores.length > 0 ? Math.round(Math.max(...scores.map((score) => scoreValue(score) || 0))) : null;
  const lowestScore =
    scores.length > 0 ? Math.round(Math.min(...scores.map((score) => scoreValue(score) || 0))) : null;
  const completedPairs = new Set(
    scoredAttempts.map((attempt) => `${attempt.userId}:${attempt.patientSessionId}`)
  );
  const possibleCompletions = users.length * sessions.length;
  const attemptsByStudentSession = allAttempts.reduce((map, attempt) => {
    const key = `${attempt.userId}:${attempt.patientSessionId}`;
    map.set(key, (map.get(key) || 0) + 1);
    return map;
  }, new Map());
  const attemptedPairs = Array.from(attemptsByStudentSession.values());
  const retriedPairs = attemptedPairs.filter((count) => count > 1).length;

  return {
    totalStudents: users.length,
    activeStudents: activeStudentIds.size,
    totalAttempts: allAttempts.length,
    averageScore: average(scores),
    medianScore: median(scores),
    highestScore,
    lowestScore,
    completionRate:
      possibleCompletions > 0 ? Math.round((completedPairs.size / possibleCompletions) * 100) : 0,
    retryRate:
      attemptedPairs.length > 0 ? Math.round((retriedPairs / attemptedPairs.length) * 100) : 0,
  };
}

function buildSessionMissedObjectives(sessionAttempts) {
  return buildCommonMissedObjectives(sessionAttempts).slice(0, 3);
}

function buildSessionDifficultySignals({ sessions, scoredAttempts, allAttempts, totalStudents }) {
  return sessions.map((session) => {
    const sessionScoredAttempts = scoredAttempts.filter(
      (attempt) => attempt.patientSessionId === session.id
    );
    const sessionAllAttempts = allAttempts.filter((attempt) => attempt.patientSessionId === session.id);
    const completedStudentIds = new Set(sessionScoredAttempts.map((attempt) => attempt.userId));
    const attemptsByStudent = sessionAllAttempts.reduce((map, attempt) => {
      map.set(attempt.userId, (map.get(attempt.userId) || 0) + 1);
      return map;
    }, new Map());
    const attemptedStudents = attemptsByStudent.size;
    const retriedStudents = Array.from(attemptsByStudent.values()).filter((count) => count > 1).length;
    const averageScore = average(sessionScoredAttempts.map((attempt) => attempt.sessionScore));
    const completionRate =
      totalStudents > 0 ? Math.round((completedStudentIds.size / totalStudents) * 100) : 0;
    const retryRate =
      attemptedStudents > 0 ? Math.round((retriedStudents / attemptedStudents) * 100) : 0;
    const difficultySignal =
      (averageScore != null && averageScore < 60) || completionRate < 50
        ? "HIGH"
        : averageScore != null && averageScore < 75
          ? "MEDIUM"
          : "LOW";

    return {
      sessionId: session.id,
      sessionTitle: session.title,
      unitTitle: session.unit?.title || null,
      attempts: sessionAllAttempts.length,
      averageScore,
      completionRate,
      retryRate,
      commonMissedObjectives: buildSessionMissedObjectives(sessionScoredAttempts),
      difficultySignal,
    };
  });
}

function buildStudentGrowthSignals({ users, scoredAttemptsByUser }) {
  return uniqueUsersByStudentKey(users)
    .map((user) => {
      const attempts = mergeAttemptsForStudent({ user, attemptsByUser: scoredAttemptsByUser }).sort((a, b) => {
        const aTime = new Date(attemptTimestamp(a) || 0).getTime();
        const bTime = new Date(attemptTimestamp(b) || 0).getTime();
        return aTime - bTime;
      });
      const firstAttempt = attempts[0] || null;
      const latestAttempt = attempts[attempts.length - 1] || null;
      const scores = attempts.map((attempt) => scoreValue(attempt.sessionScore)).filter((score) => score != null);
      const firstScore = scoreValue(firstAttempt?.sessionScore);
      const latestScore = scoreValue(latestAttempt?.sessionScore);
      const bestScore = scores.length > 0 ? Math.round(Math.max(...scores)) : null;
      const scoreDelta = firstScore != null && latestScore != null ? Math.round(latestScore - firstScore) : null;
      const trend =
        attempts.length < 2 || scoreDelta == null
          ? "INSUFFICIENT_DATA"
          : scoreDelta >= 5
            ? "IMPROVING"
            : scoreDelta <= -5
              ? "DECLINING"
              : "STABLE";

      return {
        student: compactUser(user),
        attemptsCount: attempts.length,
        firstScore,
        latestScore,
        bestScore,
        scoreDelta,
        trend,
      };
    })
    .sort((a, b) => {
      const priority = { DECLINING: 0, INSUFFICIENT_DATA: 1, STABLE: 2, IMPROVING: 3 };
      const priorityDiff = priority[a.trend] - priority[b.trend];
      if (priorityDiff !== 0) return priorityDiff;
      return (a.latestScore ?? -1) - (b.latestScore ?? -1);
    });
}

function buildTeachingInsights({
  populationPerformance,
  sessionDifficulty,
  commonMissedObjectives,
  studentGrowth,
  studentProgress,
}) {
  const insights = [];
  const mostRetriedSession = [...sessionDifficulty].sort((a, b) => b.retryRate - a.retryRate)[0];
  const mostMissedObjective = commonMissedObjectives[0] || null;
  const studentsNeverCompleted = studentProgress.filter((student) => student.completedSessions === 0).length;
  const improvingStudents = studentGrowth.filter((student) => student.trend === "IMPROVING").length;
  const growthEligibleStudents = studentGrowth.filter((student) => student.attemptsCount >= 2).length;

  if (mostRetriedSession && mostRetriedSession.retryRate > 0) {
    insights.push({
      id: "highest-retry-rate",
      title: "Highest retry rate",
      detail: `${mostRetriedSession.sessionTitle} has a ${mostRetriedSession.retryRate}% retry rate across attempted students.`,
      severity: mostRetriedSession.retryRate >= 40 ? "HIGH" : "MEDIUM",
    });
  }

  if (mostMissedObjective) {
    insights.push({
      id: "most-missed-objective",
      title: "Most frequently missed objective",
      detail: `${mostMissedObjective.title} has been missed ${mostMissedObjective.missedCount} times.`,
      severity: mostMissedObjective.missedCount >= 5 ? "HIGH" : "MEDIUM",
    });
  }

  if (populationPerformance.averageScore != null && populationPerformance.averageScore < 84) {
    insights.push({
      id: "below-gold-threshold",
      title: "Average below gold threshold",
      detail: `The current average score is ${populationPerformance.averageScore}%, below the 84% gold-score threshold.`,
      severity: populationPerformance.averageScore < 70 ? "HIGH" : "MEDIUM",
    });
  }

  if (studentsNeverCompleted > 0) {
    insights.push({
      id: "students-never-completed",
      title: "Students with no completed sessions",
      detail: `${studentsNeverCompleted} student${studentsNeverCompleted === 1 ? "" : "s"} have not completed a scored session yet.`,
      severity: studentsNeverCompleted >= 5 ? "HIGH" : "MEDIUM",
    });
  }

  if (growthEligibleStudents > 0 && improvingStudents / growthEligibleStudents >= 0.5) {
    insights.push({
      id: "students-improve-after-retry",
      title: "Most students improve after another attempt",
      detail: `${improvingStudents} of ${growthEligibleStudents} students with multiple scored attempts are trending upward.`,
      severity: "LOW",
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "no-major-signals",
      title: "No major teaching signals yet",
      detail: "More scored attempts will make class-level teaching patterns easier to identify.",
      severity: "LOW",
    });
  }

  return insights;
}

function buildCompletionBySession({ sessions, scoredAttempts, totalStudents }) {
  return sessions.map((session) => {
    const sessionAttempts = scoredAttempts.filter((attempt) => attempt.patientSessionId === session.id);
    const completedStudentIds = new Set(sessionAttempts.map((attempt) => attempt.userId));
    const bestScores = Array.from(completedStudentIds).map((userId) =>
      Math.max(
        ...sessionAttempts
          .filter((attempt) => attempt.userId === userId)
          .map((attempt) => scoreValue(attempt.sessionScore) ?? 0)
      )
    );

    return {
      patientSessionId: session.id,
      slug: session.slug,
      title: session.title,
      unitTitle: session.unit?.title || null,
      completedStudents: completedStudentIds.size,
      totalStudents,
      completionRate:
        totalStudents > 0 ? Math.round((completedStudentIds.size / totalStudents) * 100) : 0,
      averageBestScore: average(bestScores),
      totalAttempts: sessionAttempts.length,
    };
  });
}

function buildBadgeDistribution(scoredAttempts) {
  return scoredAttempts.reduce(
    (distribution, attempt) => {
      const key = badgeKey(attempt.badgeTier);
      distribution[key] = (distribution[key] || 0) + 1;
      return distribution;
    },
    { GOLD: 0, SILVER: 0, BRONZE: 0, NONE: 0 }
  );
}

function buildRecentAttempts(attempts) {
  return attempts.slice(0, 10).map((attempt) => ({
    sessionAttemptId: attempt.id,
    student: compactUser(attempt.user),
    patientSessionId: attempt.patientSessionId,
    patientSessionSlug: attempt.patientSession?.slug || null,
    patientSessionTitle: attempt.patientSession?.title || "Patient Session",
    unitTitle: attempt.patientSession?.unit?.title || null,
    score: scoreValue(attempt.sessionScore),
    badgeTier: attempt.badgeTier || "NONE",
    passed: attempt.passed,
    status: attempt.status,
    attemptedAt: attemptTimestamp(attempt),
  }));
}

function buildStudentsAtRisk({ users, attemptsByUser, scoredAttemptsByUser, recentCutoff }) {
  return uniqueUsersByStudentKey(users)
    .map((user) => {
      const attempts = mergeAttemptsForStudent({ user, attemptsByUser });
      const scoredAttempts = mergeAttemptsForStudent({ user, attemptsByUser: scoredAttemptsByUser });
      const latestScoredAttempt = scoredAttempts[0] || null;
      const latestScore = scoreValue(latestScoredAttempt?.sessionScore);
      const riskFlags = buildRiskFlags({ attempts, scoredAttempts, recentCutoff });

      if (riskFlags.length === 0) return null;

      return {
        student: compactUser(user),
        attemptsCount: attempts.length,
        latestScore,
        latestBadgeTier: latestScoredAttempt?.badgeTier || null,
        latestAttemptAt: attemptTimestamp(attempts[0] || null),
        reasons: riskFlags,
      };
    })
    .filter(Boolean)
    .slice(0, 20);
}

function buildStudentProgress({ users, attemptsByUser, sessions }) {
  return uniqueUsersByStudentKey(users)
    .map((user) => {
      const attempts = mergeAttemptsForStudent({ user, attemptsByUser });
      const scoredAttempts = attempts.filter((attempt) => scoreValue(attempt.sessionScore) != null);
      const completedSessionIds = new Set(scoredAttempts.map((attempt) => attempt.patientSessionId));
      const attemptedSessionIds = new Set(attempts.map((attempt) => attempt.patientSessionId));
      const latestAttempt = attempts[0] || null;

      return {
        student: compactUser(user),
        completedSessions: completedSessionIds.size,
        totalSessions: sessions.length,
        completionRate:
          sessions.length > 0 ? Math.round((completedSessionIds.size / sessions.length) * 100) : 0,
        attemptsCount: attempts.length,
        averageScore: average(scoredAttempts.map((attempt) => attempt.sessionScore)),
        bestScore:
          scoredAttempts.length > 0
            ? Math.round(Math.max(...scoredAttempts.map((attempt) => scoreValue(attempt.sessionScore) || 0)))
            : null,
        bestBadgeTier: bestBadgeTier(scoredAttempts),
        latestScore: scoreValue(latestAttempt?.sessionScore),
        latestAttemptAt: attemptTimestamp(latestAttempt),
        sessionsAttempted: attemptedSessionIds.size,
      };
    })
    .sort((a, b) => {
      const aTime = new Date(a.latestAttemptAt || 0).getTime();
      const bTime = new Date(b.latestAttemptAt || 0).getTime();
      return bTime - aTime;
    });
}

function buildCommonMissedObjectives(scoredAttempts) {
  const misses = new Map();

  scoredAttempts.forEach((attempt) => {
    (attempt.achievementResults || []).forEach((result) => {
      if (result.achieved) return;
      const achievement = result.achievement;
      if (!achievement) return;
      const key = objectiveAggregationKey(achievement);
      if (!key) return;
      const existing = misses.get(key) || {
        achievementId: achievement.id || key,
        slug: achievement.slug,
        title: normalizeObjectiveTitle(achievement.title),
        competencyArea: achievement.competencyArea || null,
        missedCount: 0,
        attemptsCount: 0,
      };
      existing.missedCount += 1;
      existing.attemptsCount += 1;
      if (!existing.slug && achievement.slug) existing.slug = achievement.slug;
      if (!existing.competencyArea && achievement.competencyArea) {
        existing.competencyArea = achievement.competencyArea;
      }
      misses.set(key, existing);
    });
  });

  return Array.from(misses.values())
    .sort((a, b) => b.missedCount - a.missedCount)
    .slice(0, 8);
}

function buildRiskFlags({ attempts, scoredAttempts, recentCutoff }) {
  const latestAttempt = attempts[0] || null;
  const latestScoredAttempt = scoredAttempts[0] || null;
  const latestScore = scoreValue(latestScoredAttempt?.sessionScore);
  const latestAttemptAt = attemptTimestamp(latestAttempt);
  const flags = [];

  if (attempts.length === 0) flags.push("No attempts yet");
  if (latestScore != null && latestScore < AT_RISK_SCORE_THRESHOLD) {
    flags.push(`Latest score below ${AT_RISK_SCORE_THRESHOLD}%`);
  }
  if (latestAttemptAt && new Date(latestAttemptAt).getTime() < recentCutoff.getTime()) {
    flags.push(`No activity in ${RECENT_ACTIVITY_DAYS}+ days`);
  }

  return flags;
}

function summarizeAttemptForStudent(attempt) {
  const achievementResults = attempt.achievementResults || [];
  const objectives = achievementResults
    .map((result) => {
      const achievement = result.achievement;
      if (!achievement) return null;
      return {
        achievementId: achievement.id,
        slug: achievement.slug,
        title: achievement.title,
        competencyArea: achievement.competencyArea || null,
        achieved: Boolean(result.achieved),
        percentScore: scoreValue(result.percentScore),
        feedback: result.feedback || null,
      };
    })
    .filter(Boolean);

  return {
    id: attempt.id,
    patientSessionId: attempt.patientSessionId,
    patientSessionSlug: attempt.patientSession?.slug || null,
    patientSessionTitle: attempt.patientSession?.title || "Patient Session",
    unitTitle: attempt.patientSession?.unit?.title || null,
    status: attempt.status,
    score: scoreValue(attempt.sessionScore),
    badgeTier: attempt.badgeTier || "NONE",
    passed: attempt.passed,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
    scoredAt: attempt.scoredAt,
    activityAt: attemptTimestamp(attempt),
    completedObjectives: objectives.filter((objective) => objective.achieved),
    missedObjectives: objectives.filter((objective) => !objective.achieved),
  };
}

function buildStudentSessions({ sessions, attempts }) {
  return sessions.map((session) => {
    const sessionAttempts = attempts.filter((attempt) => attempt.patientSessionId === session.id);
    const scoredAttempts = sessionAttempts.filter((attempt) => scoreValue(attempt.sessionScore) != null);
    const latestAttempt = sessionAttempts[0] || null;
    const bestScore =
      scoredAttempts.length > 0
        ? Math.round(Math.max(...scoredAttempts.map((attempt) => scoreValue(attempt.sessionScore) || 0)))
        : null;
    const bestAttempt =
      bestScore == null
        ? null
        : scoredAttempts.find((attempt) => Math.round(scoreValue(attempt.sessionScore) || 0) === bestScore);

    return {
      patientSessionId: session.id,
      slug: session.slug,
      title: session.title,
      unitTitle: session.unit?.title || null,
      attemptsCount: sessionAttempts.length,
      bestScore,
      latestScore: scoreValue(latestAttempt?.sessionScore),
      bestBadgeTier: bestAttempt?.badgeTier || "NONE",
      completed: scoredAttempts.length > 0,
    };
  });
}

function buildObjectiveSummary(attempts) {
  const summaries = new Map();

  attempts.forEach((attempt) => {
    (attempt.achievementResults || []).forEach((result) => {
      const achievement = result.achievement;
      if (!achievement) return;

      const existing = summaries.get(achievement.id) || {
        achievementId: achievement.id,
        slug: achievement.slug,
        title: achievement.title,
        competencyArea: achievement.competencyArea || null,
        completedCount: 0,
        missedCount: 0,
        latestStatus: null,
        latestAt: null,
      };
      const achieved = Boolean(result.achieved);
      if (achieved) existing.completedCount += 1;
      else existing.missedCount += 1;

      const resultTime = new Date(attemptTimestamp(attempt) || 0).getTime();
      const latestTime = new Date(existing.latestAt || 0).getTime();
      if (!existing.latestAt || resultTime >= latestTime) {
        existing.latestStatus = achieved ? "completed" : "missed";
        existing.latestAt = attemptTimestamp(attempt);
      }

      summaries.set(achievement.id, existing);
    });
  });

  return Array.from(summaries.values()).sort((a, b) => {
    const missedDiff = b.missedCount - a.missedCount;
    if (missedDiff !== 0) return missedDiff;
    return String(a.title || "").localeCompare(String(b.title || ""));
  });
}

async function buildFacultyDashboard() {
  const recentCutoff = new Date(Date.now() - RECENT_ACTIVITY_DAYS * 24 * 60 * 60 * 1000);

  const [users, sessions, allAttempts, scoredAttempts] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
    }),
    prisma.patientSession.findMany({
      where: { active: true },
      include: { unit: true },
      orderBy: [{ unit: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    }),
    prisma.sessionAttempt.findMany({
      include: {
        user: true,
        patientSession: { include: { unit: true } },
      },
      orderBy: [{ scoredAt: "desc" }, { submittedAt: "desc" }, { startedAt: "desc" }],
    }),
    prisma.sessionAttempt.findMany({
      where: {
        sessionScore: { not: null },
      },
      include: {
        user: true,
        patientSession: { include: { unit: true } },
        achievementResults: { include: { achievement: true } },
      },
      orderBy: [{ scoredAt: "desc" }, { submittedAt: "desc" }, { startedAt: "desc" }],
    }),
  ]);

  const attemptsByUser = allAttempts.reduce(addAttemptToStudentMap, new Map());
  const scoredAttemptsByUser = scoredAttempts.reduce(addAttemptToStudentMap, new Map());

  const activeStudentIds = new Set(
    allAttempts
      .filter((attempt) => {
        const timestamp = attemptTimestamp(attempt);
        return timestamp && new Date(timestamp).getTime() >= recentCutoff.getTime();
      })
      .map((attempt) => attempt.userId)
  );

  // TODO: replace this hard-coded population with LearningGroup filtering.
  // Future architecture: LearningGroup, LearningGroupMember, group types
  // COURSE/RESEARCH/PILOT/WORKSHOP/PRIVATE/DEMO, group roles
  // STUDENT/FACULTY/TA/RESEARCHER/OBSERVER, cross-population comparisons,
  // semester comparisons, research report export, AI instructor recommendations,
  // and a longitudinal competency model.
  const selectedPopulation = { id: "all", name: "All Students", type: "ALL_USERS" };
  const completionBySession = buildCompletionBySession({
    sessions,
    scoredAttempts,
    totalStudents: users.length,
  });
  const commonMissedObjectives = buildCommonMissedObjectives(scoredAttempts);
  const studentProgress = buildStudentProgress({ users, attemptsByUser, sessions });
  const populationPerformance = buildPopulationPerformance({
    users,
    sessions,
    allAttempts,
    scoredAttempts,
    activeStudentIds,
  });
  const sessionDifficulty = buildSessionDifficultySignals({
    sessions,
    scoredAttempts,
    allAttempts,
    totalStudents: users.length,
  });
  const studentGrowth = buildStudentGrowthSignals({ users, scoredAttemptsByUser });
  const teachingInsights = buildTeachingInsights({
    populationPerformance,
    sessionDifficulty,
    commonMissedObjectives,
    studentGrowth,
    studentProgress,
  });

  return {
    generatedAt: new Date().toISOString(),
    assumptions: {
      facultyAccess: "TODO: enforce role-based faculty access when roles exist.",
      activeStudentWindowDays: RECENT_ACTIVITY_DAYS,
      atRiskScoreThreshold: AT_RISK_SCORE_THRESHOLD,
    },
    selectedPopulation,
    totalStudents: users.length,
    activeStudents: activeStudentIds.size,
    totalAttempts: allAttempts.length,
    averageScore: average(scoredAttempts.map((attempt) => attempt.sessionScore)),
    completionBySession,
    badgeDistribution: buildBadgeDistribution(scoredAttempts),
    recentAttempts: buildRecentAttempts(allAttempts),
    studentsAtRisk: buildStudentsAtRisk({
      users,
      attemptsByUser,
      scoredAttemptsByUser,
      recentCutoff,
    }),
    studentProgress,
    commonMissedObjectives,
    analytics: {
      populationPerformance,
      scoreDistribution: buildScoreDistribution(scoredAttempts),
      sessionDifficulty,
      studentGrowth,
      teachingInsights,
    },
    todos: [
      "TODO: role-based faculty access.",
      "TODO: filters by course/section.",
      "TODO: competency heatmaps.",
      "TODO: export CSV.",
      "TODO: drill-down per student.",
      "TODO: longitudinal trends.",
    ],
  };
}

async function buildFacultyStudentDetail(studentId) {
  const recentCutoff = new Date(Date.now() - RECENT_ACTIVITY_DAYS * 24 * 60 * 60 * 1000);

  const [student, sessions, attempts] = await Promise.all([
    prisma.user.findUnique({
      where: { id: studentId },
    }),
    prisma.patientSession.findMany({
      where: { active: true },
      include: { unit: true },
      orderBy: [{ unit: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    }),
    prisma.sessionAttempt.findMany({
      where: { userId: studentId },
      include: {
        patientSession: { include: { unit: true } },
        achievementResults: { include: { achievement: true } },
      },
      orderBy: [{ scoredAt: "desc" }, { submittedAt: "desc" }, { startedAt: "desc" }],
    }),
  ]);

  if (!student) return null;

  const scoredAttempts = attempts.filter((attempt) => scoreValue(attempt.sessionScore) != null);
  const latestAttempt = attempts[0] || null;
  const latestScoredAttempt = scoredAttempts[0] || null;
  const completedSessionIds = new Set(scoredAttempts.map((attempt) => attempt.patientSessionId));

  return {
    generatedAt: new Date().toISOString(),
    student: {
      ...compactUser(student),
      displayName: student.name || student.email || "Student",
    },
    summary: {
      totalAttempts: attempts.length,
      averageScore: average(scoredAttempts.map((attempt) => attempt.sessionScore)),
      latestScore: scoreValue(latestScoredAttempt?.sessionScore),
      latestActivityAt: attemptTimestamp(latestAttempt),
      bestBadgeTier: bestBadgeTier(scoredAttempts),
      completedSessionsCount: completedSessionIds.size,
      totalSessions: sessions.length,
    },
    riskFlags: buildRiskFlags({ attempts, scoredAttempts, recentCutoff }),
    attempts: attempts.map(summarizeAttemptForStudent),
    sessions: buildStudentSessions({ sessions, attempts }),
    objectiveSummary: buildObjectiveSummary(scoredAttempts),
    todos: [
      "TODO: role-based faculty access.",
      "TODO: course/section filters.",
      "TODO: longitudinal trend charts.",
      "TODO: CSV export.",
      "TODO: detailed attempt transcript/review.",
    ],
  };
}

function buildFacultyDashboardCsv(dashboard) {
  const rows = dashboard.studentProgress || [];
  const riskByStudentId = new Map(
    (dashboard.studentsAtRisk || []).map((item) => [item.student.id, item.reasons || []])
  );

  return buildCsv(rows, [
    { header: "studentId", value: (row) => row.student.id },
    { header: "studentName", value: (row) => row.student.name || "Student" },
    { header: "studentEmail", value: (row) => row.student.email || "" },
    { header: "totalAttempts", value: (row) => row.attemptsCount },
    { header: "averageScore", value: (row) => row.averageScore },
    { header: "latestScore", value: (row) => row.latestScore },
    { header: "latestActivityAt", value: (row) => row.latestAttemptAt },
    { header: "completedSessionsCount", value: (row) => row.completedSessions },
    { header: "bestBadgeTier", value: (row) => row.bestBadgeTier || "NONE" },
    { header: "riskFlags", value: (row) => riskByStudentId.get(row.student.id) || [] },
    { header: "sessionsCompleted", value: (row) => row.completedSessions },
    { header: "sessionsAttempted", value: (row) => row.sessionsAttempted },
  ]);
}

function buildFacultyStudentDetailCsv(detail) {
  return buildCsv(detail.attempts || [], [
    { header: "attemptId", value: (row) => row.id },
    { header: "sessionId", value: (row) => row.patientSessionId },
    { header: "sessionTitle", value: (row) => row.patientSessionTitle },
    { header: "score", value: (row) => row.score },
    { header: "badgeTier", value: (row) => row.badgeTier },
    { header: "createdAt", value: (row) => row.startedAt },
    { header: "submittedAt", value: (row) => row.submittedAt },
    { header: "completedObjectives", value: (row) => (row.completedObjectives || []).map((item) => item.title) },
    { header: "missedObjectives", value: (row) => (row.missedObjectives || []).map((item) => item.title) },
  ]);
}

module.exports = {
  buildFacultyDashboard,
  buildFacultyStudentDetail,
  buildFacultyDashboardCsv,
  buildFacultyStudentDetailCsv,
  compactUser,
  scoreValue,
  attemptTimestamp,
};
