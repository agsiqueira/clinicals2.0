const prisma = require("../db/prisma");
const { buildClinicalPortfolio } = require("./clinicalPortfolio");
const { buildLearningPathRoadmap } = require("../utils/roadmap");

const ROADMAP_CTA = {
  title: "Explore your full learning path",
  body: "See all units, upcoming encounters, and what unlocks next.",
};

const DISPLAY_SESSION_TITLES = {
  "first-patient": "Taylor Reed: Introduction & Chief Complaint",
  "first-patient-hpi": "Taylor Reed: Complete Clinical Encounter",
  "seasonal-allergies-complete-hpi": "Sarah Johnson: Complete Clinical Encounter",
};

function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sortByOrderAndTitle(a, b) {
  const orderDiff = (a.sortOrder || 0) - (b.sortOrder || 0);
  if (orderDiff !== 0) return orderDiff;
  return String(a.title || "").localeCompare(String(b.title || ""));
}

function unitDisplayTitle(unit) {
  const title = String(unit?.title || "").trim();
  if (unit?.slug === "unit-1-clinical-encounter") return "Unit 1: First Clinical Encounter";
  if (/^Unit\s+\d+\s*:/i.test(title)) return title;

  const sortOrder = Number(unit?.sortOrder);
  if (Number.isFinite(sortOrder) && sortOrder > 0) {
    return `Unit ${sortOrder}: ${title}`;
  }

  return title;
}

function sessionDisplayTitle(session) {
  const mapped = DISPLAY_SESSION_TITLES[session?.slug];
  if (mapped) return mapped;
  return String(session?.title || "").replace(/Complete HPI/gi, "Complete Clinical Encounter");
}

function estimatedTime(session) {
  const min = Number(session?.estimatedMinutesMin);
  const max = Number(session?.estimatedMinutesMax);
  const hasMin = Number.isFinite(min) && min > 0;
  const hasMax = Number.isFinite(max) && max > 0;

  if (!hasMin && !hasMax) {
    return { min: null, max: null, label: null };
  }

  const label =
    hasMin && hasMax
      ? min === max
        ? `${min} minutes`
        : `${min}-${max} minutes`
      : `${hasMin ? min : max} minutes`;

  return {
    min: hasMin ? min : null,
    max: hasMax ? max : null,
    label,
  };
}

function flattenRoadmap(paths, rawPaths) {
  const rawSessionBySlug = new Map();
  for (const path of rawPaths || []) {
    for (const unit of path.units || []) {
      for (const session of unit.sessions || []) {
        rawSessionBySlug.set(session.slug, { path, unit, session });
      }
    }
  }

  return (paths || []).flatMap((path) =>
    [...(path.units || [])].sort(sortByOrderAndTitle).flatMap((unit) =>
      [...(unit.sessions || [])].sort(sortByOrderAndTitle).map((session) => ({
        path,
        unit,
        session,
        raw: rawSessionBySlug.get(session.slug) || null,
      }))
    )
  );
}

function weakestCompetency(portfolio) {
  return (
    (portfolio?.competencies || [])
      .filter((competency) => toFiniteNumber(competency.attempts, 0) > 0)
      .sort((a, b) => {
        const aScore = toFiniteNumber(a.latestPercentScore ?? a.bestPercentScore, 101);
        const bScore = toFiniteNumber(b.latestPercentScore ?? b.bestPercentScore, 101);
        return aScore - bScore;
      })[0] || null
  );
}

function closestInProgressMilestone(portfolio) {
  return (
    (portfolio?.milestones || [])
      .filter((milestone) => {
        const target = Number(milestone.targetValue);
        const current = Number(milestone.currentValue);
        return (
          milestone.status === "IN_PROGRESS" &&
          Number.isFinite(target) &&
          target > 0 &&
          Number.isFinite(current) &&
          current < target
        );
      })
      .sort((a, b) => {
        const aRemaining = (a.targetValue - a.currentValue) / a.targetValue;
        const bRemaining = (b.targetValue - b.currentValue) / b.targetValue;
        return aRemaining - bRemaining;
      })[0] || null
  );
}

function milestoneGoal(milestone, type = "milestone") {
  if (!milestone) return null;

  return {
    type,
    slug: milestone.slug,
    title: milestone.title,
    icon: milestone.icon || null,
    currentValue: milestone.currentValue ?? 0,
    targetValue: milestone.targetValue ?? null,
    description: milestone.description || null,
  };
}

function fallbackFirstGoldGoal(portfolio) {
  return (
    milestoneGoal((portfolio?.milestones || []).find((milestone) => milestone.slug === "first-gold-badge")) || {
      type: "milestone",
      slug: "first-gold-badge",
      title: "First Gold Badge",
      icon: "🥇",
      currentValue: 0,
      targetValue: 1,
      description: "Earn your first Gold session badge.",
    }
  );
}

function buildRecommendedEncounter(item) {
  if (!item) return null;

  const rawSession = item.raw?.session || {};
  const caseId = rawSession.patientCase?.caseId || rawSession.case?.caseId || null;
  const requiresHpi = Boolean(item.session.workflow?.requiresHpi ?? item.session.requiresHpi);

  return {
    patientSessionId: item.session.id,
    patientSessionSlug: item.session.slug,
    caseId,
    title: item.session.title,
    displayTitle: sessionDisplayTitle(item.session),
    description: item.session.description || item.session.objective || null,
    unitTitle: unitDisplayTitle(item.unit),
    status: item.session.status,
    badgeTier: item.session.badgeTier || null,
    bestSessionScore: item.session.bestSessionScore ?? null,
    estimatedTime: estimatedTime(item.session),
    launchParams: {
      caseId,
      patientSessionSlug: item.session.slug,
      requiresHpi,
    },
  };
}

function buildBlockedGoal(lockedItem, retryItem) {
  return {
    type: "unlock",
    slug: "unlock-next-encounter",
    title: "Unlock next encounter",
    icon: "🔓",
    currentValue: Math.floor(toFiniteNumber(retryItem?.session?.bestSessionScore, 0)),
    targetValue: 84,
    description: lockedItem
      ? `Score 84% or higher to unlock ${unitDisplayTitle(lockedItem.unit)}.`
      : "Score 84% or higher to unlock the next encounter.",
  };
}

function buildDailyBriefing({ portfolio, recommendationKind, recommendedItem, blockedItem, retryItem }) {
  const completedSessions = toFiniteNumber(portfolio?.learningPathProgress?.completedSessions, 0);
  const recentGold = (portfolio?.recentPatients || []).some((patient) => patient.badgeTier === "GOLD");
  const weakest = weakestCompetency(portfolio);
  const closeMilestone = closestInProgressMilestone(portfolio);
  const recommendedRequiresHpi = Boolean(
    recommendedItem?.session?.workflow?.requiresHpi ?? recommendedItem?.session?.requiresHpi
  );

  if (recommendationKind === "complete") {
    const foundationsGoal =
      milestoneGoal(
        (portfolio?.milestones || []).find(
          (milestone) => milestone.slug === "clinical-foundations-complete"
        ),
        "progression"
      ) || {
        type: "reflection",
        slug: "clinical-portfolio-reflection",
        title: "Review Clinical Portfolio",
        icon: "🏆",
        currentValue: null,
        targetValue: null,
        description: "Reflect on your progress and prepare for the next clinical experience.",
      };

    return {
      motivation: "Excellent work. You've completed the currently available encounters.",
      focus: "Review your Clinical Portfolio to reflect on the skills and milestones you've built.",
      nextGoal: foundationsGoal,
    };
  }

  if (recommendationKind === "blocked") {
    return {
      motivation: "You're close. A score of 84% unlocks the next clinical encounter.",
      focus: weakest?.title
        ? `Focus on ${weakest.title} to improve your score before retrying.`
        : "Review your previous feedback and focus on the area that kept you below 84%.",
      nextGoal: buildBlockedGoal(blockedItem, retryItem),
    };
  }

  if (completedSessions === 0 && !(portfolio?.recentPatients || []).length) {
    return {
      motivation: "Welcome. Your first goal is to begin the encounter professionally.",
      focus: "Start with a professional introduction and focus on identifying the patient's main concern.",
      nextGoal: fallbackFirstGoldGoal(portfolio),
    };
  }

  const nextGoal = closeMilestone ? milestoneGoal(closeMilestone) : fallbackFirstGoldGoal(portfolio);

  if (recentGold) {
    return {
      motivation: "Excellent work earning Gold.",
      focus: recommendedRequiresHpi
        ? "Keep the momentum going by applying the same structured approach to the full patient history."
        : "Keep the momentum going by applying the same structured approach in your next encounter.",
      nextGoal,
    };
  }

  if (recommendedRequiresHpi) {
    return {
      motivation: "Good progress. This next encounter builds on your opening skills.",
      focus: weakest?.title
        ? `Focus on ${weakest.title} and organize the patient's history clearly.`
        : "Focus on organizing the patient's history and summarizing the key details clearly.",
      nextGoal,
    };
  }

  return {
    motivation: "Good progress. Your next encounter is ready.",
    focus: weakest?.title
      ? `Use this encounter to strengthen ${weakest.title}.`
      : "Focus on a confident opening and invite the patient to share their main concern.",
    nextGoal,
  };
}

async function loadRoadmapPaths({ userId, client }) {
  return client.learningPath.findMany({
    where: { active: true },
    include: {
      preceptorPersona: true,
      units: {
        where: { active: true },
        include: {
          sessions: {
            where: { active: true },
            include: {
              patientCase: true,
              achievements: {
                where: { active: true },
              },
              attempts: {
                where: { userId },
                orderBy: [{ scoredAt: "desc" }, { submittedAt: "desc" }, { startedAt: "desc" }],
              },
            },
          },
        },
      },
    },
    orderBy: { sortOrder: "asc" },
  });
}

async function buildToday({ userId, client = prisma }) {
  const [portfolio, rawPaths] = await Promise.all([
    buildClinicalPortfolio({ userId, client }),
    loadRoadmapPaths({ userId, client }),
  ]);
  const roadmap = buildLearningPathRoadmap(rawPaths);
  const roadmapItems = flattenRoadmap(roadmap, rawPaths);
  const availableItem = roadmapItems.find((item) => item.session.status === "available");
  const lockedItem = roadmapItems.find((item) => item.session.status === "locked");
  const retryItem =
    lockedItem &&
    [...roadmapItems]
      .reverse()
      .find(
        (item) =>
          item.session.status === "completed" && toFiniteNumber(item.session.bestSessionScore, 100) < 84
      );

  let recommendationKind = "complete";
  let recommendedItem = null;
  if (availableItem) {
    recommendationKind = "available";
    recommendedItem = availableItem;
  } else if (retryItem) {
    recommendationKind = "blocked";
    recommendedItem = retryItem;
  }

  return {
    identity: {
      professionalLevel: portfolio.identity.professionalLevel,
      levelTitle: portfolio.identity.levelTitle,
      xp: portfolio.identity.xp,
      nextLevelXp: portfolio.identity.nextLevelXp,
      streak: portfolio.streak,
    },
    recommendedEncounter: buildRecommendedEncounter(recommendedItem),
    dailyBriefing: buildDailyBriefing({
      portfolio,
      recommendationKind,
      recommendedItem,
      blockedItem: lockedItem,
      retryItem,
    }),
    roadmapCta: ROADMAP_CTA,
  };
}

module.exports = {
  buildToday,
  buildDailyBriefing,
  buildRecommendedEncounter,
  sessionDisplayTitle,
  unitDisplayTitle,
};
