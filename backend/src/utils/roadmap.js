function sortByOrderAndTitle(a, b) {
  const orderDiff = (a.sortOrder || 0) - (b.sortOrder || 0);
  if (orderDiff !== 0) return orderDiff;
  return String(a.title || "").localeCompare(String(b.title || ""));
}

function findBestAttempt(attempts = []) {
  return attempts.reduce((best, attempt) => {
    if (!best) return attempt;
    const attemptScore = Number(attempt.sessionScore ?? -1);
    const bestScore = Number(best.sessionScore ?? -1);
    if (attemptScore > bestScore) return attempt;
    if (attemptScore === bestScore) {
      const attemptTime = new Date(attempt.scoredAt || attempt.submittedAt || attempt.startedAt || 0).getTime();
      const bestTime = new Date(best.scoredAt || best.submittedAt || best.startedAt || 0).getTime();
      if (attemptTime > bestTime) return attempt;
    }
    return best;
  }, null);
}

function buildSessionStatus({ session, previousCompleted }) {
  const bestAttempt = findBestAttempt(session.attempts || []);
  const completed = Boolean(bestAttempt?.badgeTier);
  const status = completed ? "completed" : previousCompleted ? "available" : "locked";

  return {
    status,
    completed,
    badgeTier: bestAttempt?.badgeTier || null,
    bestSessionScore: bestAttempt?.sessionScore ?? null,
    latestSessionScore: session.attempts?.[0]?.sessionScore ?? null,
  };
}

function summarizeAchievement(achievement) {
  return {
    id: achievement.id,
    slug: achievement.slug,
    title: achievement.title,
    description: achievement.description,
    competencyArea: achievement.competencyArea,
    weightPercent: achievement.weightPercent,
    rubricCriterionIds: achievement.rubricCriterionIds || [],
  };
}

const HPI_RUBRIC_CRITERION_IDS = new Set(["reporter_hpi_summary_oldcarts"]);

function patientSessionRequiresHpi(session) {
  return (session.achievements || []).some((achievement) => {
    const rubricCriterionIds = Array.isArray(achievement.rubricCriterionIds)
      ? achievement.rubricCriterionIds
      : [];
    return rubricCriterionIds.some((id) => HPI_RUBRIC_CRITERION_IDS.has(id));
  });
}

function summarizePatientSession(session, statusSummary) {
  return {
    id: session.id,
    slug: session.slug,
    title: session.title,
    objective: session.objective,
    description: session.description,
    estimatedMinutesMin: session.estimatedMinutesMin,
    estimatedMinutesMax: session.estimatedMinutesMax,
    badgeThresholds: {
      gold: session.goldThreshold,
      silver: session.silverThreshold,
      bronze: session.bronzeThreshold,
    },
    workflow: {
      requiresHpi: patientSessionRequiresHpi(session),
    },
    requiresHpi: patientSessionRequiresHpi(session),
    achievements: (session.achievements || []).sort(sortByOrderAndTitle).map(summarizeAchievement),
    status: statusSummary.status,
    badgeTier: statusSummary.badgeTier,
    bestSessionScore: statusSummary.bestSessionScore,
    latestSessionScore: statusSummary.latestSessionScore,
  };
}

function buildLearningPathRoadmap(learningPaths = []) {
  return learningPaths.sort(sortByOrderAndTitle).map((path) => ({
    id: path.id,
    slug: path.slug,
    title: path.title,
    description: path.description,
    active: path.active,
    sortOrder: path.sortOrder,
    preceptorPersona: path.preceptorPersona
      ? {
          id: path.preceptorPersona.id,
          slug: path.preceptorPersona.slug,
          name: path.preceptorPersona.name,
          specialty: path.preceptorPersona.specialty,
          description: path.preceptorPersona.description,
          avatarUrl: path.preceptorPersona.avatarUrl,
        }
      : null,
    units: (path.units || []).sort(sortByOrderAndTitle).map((unit) => {
      let previousCompleted = true;
      const sessions = (unit.sessions || []).sort(sortByOrderAndTitle).map((session) => {
        const statusSummary = buildSessionStatus({ session, previousCompleted });
        previousCompleted = statusSummary.completed;
        return summarizePatientSession(session, statusSummary);
      });

      return {
        id: unit.id,
        slug: unit.slug,
        title: unit.title,
        description: unit.description,
        objective: unit.objective,
        active: unit.active,
        sortOrder: unit.sortOrder,
        sessions,
      };
    }),
  }));
}

function buildSessionOverview({ session, preceptorPersona }) {
  return {
    id: session.id,
    slug: session.slug,
    title: session.title,
    objective: session.objective,
    description: session.description,
    estimatedTime: {
      min: session.estimatedMinutesMin,
      max: session.estimatedMinutesMax,
    },
    badgeThresholds: {
      gold: session.goldThreshold,
      silver: session.silverThreshold,
      bronze: session.bronzeThreshold,
    },
    workflow: {
      requiresHpi: patientSessionRequiresHpi(session),
    },
    requiresHpi: patientSessionRequiresHpi(session),
    achievements: (session.achievements || []).sort(sortByOrderAndTitle).map(summarizeAchievement),
    preceptorBriefing: buildPreceptorBriefing({ session, preceptorPersona }),
    linkedCase: session.patientCase
      ? {
          id: session.patientCase.id,
          caseId: session.patientCase.caseId,
          title: session.patientCase.title,
          level: session.patientCase.level,
          setting: session.patientCase.setting,
        }
      : null,
    preceptorPersona: preceptorPersona
      ? {
          id: preceptorPersona.id,
          slug: preceptorPersona.slug,
          name: preceptorPersona.name,
          specialty: preceptorPersona.specialty,
          avatarUrl: preceptorPersona.avatarUrl,
        }
      : null,
  };
}

function buildPreceptorBriefing({ session, preceptorPersona }) {
  const preceptorName = preceptorPersona?.name || "Your preceptor";
  const achievementList = (session.achievements || [])
    .sort(sortByOrderAndTitle)
    .map((achievement) => achievement.title)
    .join(" and ");

  return [
    `Welcome. I'm ${preceptorName}.`,
    `Today you will work on ${session.title}.`,
    session.objective ? `Your goal is to ${session.objective.toLowerCase()}` : null,
    achievementList ? `Focus on: ${achievementList}.` : null,
    "When you are ready, begin the encounter.",
  ]
    .filter(Boolean)
    .join(" ");
}

module.exports = {
  buildLearningPathRoadmap,
  buildSessionOverview,
  buildSessionStatus,
  determineBestAttempt: findBestAttempt,
  patientSessionRequiresHpi,
};
