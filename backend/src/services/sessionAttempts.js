const prisma = require("../db/prisma");
const {
  computeAchievementResults,
  computeSessionScore,
  determineBadgeTier,
} = require("../utils/achievementScoring");

async function resolvePatientSessionForAttempt({
  caseRecordId,
  patientSessionSlug,
  client = prisma,
}) {
  const slug = patientSessionSlug || "first-patient";

  return client.patientSession.findFirst({
    where: {
      caseId: caseRecordId,
      slug,
      active: true,
    },
    include: {
      achievements: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

async function createSessionAttemptForConversation({
  userId,
  caseRecordId,
  conversationId,
  patientSessionSlug,
}) {
  const patientSession = await resolvePatientSessionForAttempt({
    caseRecordId,
    patientSessionSlug,
  });
  if (!patientSession) return null;

  return prisma.sessionAttempt.upsert({
    where: { conversationId },
    create: {
      userId,
      patientSessionId: patientSession.id,
      conversationId,
      status: "IN_PROGRESS",
    },
    update: {
      userId,
      patientSessionId: patientSession.id,
    },
  });
}

async function getOrCreateSessionAttemptForConversation(conversation, patientSessionSlug) {
  if (!conversation) return null;

  const existing = await prisma.sessionAttempt.findUnique({
    where: { conversationId: conversation.id },
  });
  if (existing) return existing;

  return createSessionAttemptForConversation({
    userId: conversation.userId,
    caseRecordId: conversation.caseId,
    conversationId: conversation.id,
    patientSessionSlug,
  });
}

function buildPlaceholderFeedback({ badgeTier, sessionScore, achievementResults }) {
  const achievedCount = achievementResults.filter((result) => result.achieved).length;
  const totalCount = achievementResults.length;

  return {
    recognition: `You completed the session and earned a ${badgeTier} result with a score of ${sessionScore}%.`,
    coaching:
      "Use the report to choose one focused skill to improve, then ask Dr. Martinez for coaching on that area.",
    encouragement: `You met ${achievedCount} of ${totalCount} mapped achievement targets. Keep practicing with intention.`,
    summary: `Session score: ${sessionScore}%. Badge tier: ${badgeTier}.`,
  };
}

function badgeLabel(badgeTier) {
  if (!badgeTier || badgeTier === "NONE") return "No badge";
  return badgeTier.charAt(0) + badgeTier.slice(1).toLowerCase();
}

function summarizeAchievementResults({ achievementResults, achievementsById }) {
  return (achievementResults || []).map((result) => {
    const achievement = achievementsById.get(result.achievementId);
    return {
      achievementId: result.achievementId,
      slug: achievement?.slug || null,
      title: achievement?.title || "Achievement",
      earnedPoints: result.earnedPoints,
      maxPoints: result.maxPoints,
      percentScore: result.percentScore,
      weightedScore: result.weightedScore,
      achieved: result.achieved,
      feedback: result.feedback || null,
    };
  });
}

function buildConciseDebriefContent({ feedback, badgeTier, sessionScore, achievementSummaries }) {
  const achieved = achievementSummaries.filter((result) => result.achieved);
  const needsPractice = achievementSummaries.filter((result) => !result.achieved);
  const achievedTitles = achieved.map((result) => result.title).join(" and ");
  const practiceTitles = needsPractice.map((result) => result.title).join(" and ");
  const badge = badgeLabel(badgeTier);

  return {
    recognition:
      feedback?.recognition ||
      (achievedTitles
        ? `You completed the encounter and showed progress in ${achievedTitles}.`
        : `You completed the encounter and earned ${sessionScore}%.`),
    coaching:
      (feedback?.coaching && !feedback.coaching.includes("Review:") ? feedback.coaching : null) ||
      (practiceTitles
        ? `Use the report to review ${practiceTitles}, then ask Dr. Martinez for specific coaching.`
        : "Use the report to choose one focused skill to carry into your next encounter."),
    encouragement:
      feedback?.encouragement ||
      `You earned ${badge} with a session score of ${sessionScore}%. Keep practicing; every focused attempt builds clinical confidence.`,
    summary: feedback?.summary || `Session score: ${sessionScore}%. Badge earned: ${badge}.`,
  };
}

function weakestAchievementTitles(achievementSummaries) {
  const scored = (achievementSummaries || []).filter((result) =>
    Number.isFinite(Number(result.percentScore))
  );
  if (scored.length === 0) return [];

  const weakestScore = Math.min(...scored.map((result) => Number(result.percentScore)));
  return scored
    .filter((result) => Number(result.percentScore) === weakestScore)
    .map((result) => result.title)
    .filter(Boolean);
}

function formatFocusArea(titles) {
  if (!titles.length) return "the areas marked for improvement";
  if (titles.length === 1) return titles[0];
  if (titles.length === 2) return `${titles[0]} and ${titles[1]}`;
  return `${titles.slice(0, -1).join(", ")}, and ${titles[titles.length - 1]}`;
}

function buildDebriefGreeting({ achievementSummaries }) {
  const focusArea = formatFocusArea(weakestAchievementTitles(achievementSummaries));
  return `Thanks for completing the session. As you review your report, pay particular attention to ${focusArea}. When you're ready, I'd be happy to discuss what happened and how to improve next time.`;
}

function buildSessionDebriefPayload({
  sessionAttemptId,
  sessionScore,
  badgeTier,
  achievementResults,
  achievements,
  feedback,
}) {
  if (!sessionAttemptId) return null;

  const achievementsById = new Map((achievements || []).map((achievement) => [achievement.id, achievement]));
  const achievementSummaries = summarizeAchievementResults({
    achievementResults,
    achievementsById,
  });
  const score = sessionScore ?? 0;
  const tier = badgeTier || "NONE";
  const debrief = buildConciseDebriefContent({
    feedback,
    badgeTier: tier,
    sessionScore: score,
    achievementSummaries,
  });

  return {
    sessionAttemptId,
    sessionScore: score,
    badgeTier: tier,
    badgeLabel: badgeLabel(tier),
    greeting: buildDebriefGreeting({ achievementSummaries }),
    recognition: debrief.recognition,
    coaching: debrief.coaching,
    encouragement: debrief.encouragement,
    summary: debrief.summary,
    achievementResults: achievementSummaries,
  };
}

async function finalizeSessionAttemptFromSubmission({ sessionAttemptId, submission }) {
  if (!sessionAttemptId || !submission) return null;

  const sessionAttempt = await prisma.sessionAttempt.findUnique({
    where: { id: sessionAttemptId },
    include: {
      patientSession: {
        include: {
          achievements: {
            where: { active: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });

  if (!sessionAttempt) return null;

  const criteriaResults = submission.details?.criteria_results || [];
  const achievementResults = computeAchievementResults(
    sessionAttempt.patientSession.achievements,
    criteriaResults
  );
  const sessionScore = computeSessionScore(achievementResults);
  const badgeTier = determineBadgeTier(sessionScore);

  const feedback = buildPlaceholderFeedback({ badgeTier, sessionScore, achievementResults });

  await prisma.$transaction([
    ...achievementResults.map((result) =>
      prisma.achievementResult.upsert({
        where: {
          sessionAttemptId_achievementId: {
            sessionAttemptId,
            achievementId: result.achievementId,
          },
        },
        create: {
          sessionAttemptId,
          achievementId: result.achievementId,
          earnedPoints: result.earnedPoints,
          maxPoints: result.maxPoints,
          percentScore: result.percentScore,
          weightedScore: result.weightedScore,
          achieved: result.achieved,
          rubricCriterionIds: result.rubricCriterionIds,
          rubricCriteriaResults: result.rubricCriteriaResults,
          evidence: result.evidence,
          feedback: result.feedback,
        },
        update: {
          earnedPoints: result.earnedPoints,
          maxPoints: result.maxPoints,
          percentScore: result.percentScore,
          weightedScore: result.weightedScore,
          achieved: result.achieved,
          rubricCriterionIds: result.rubricCriterionIds,
          rubricCriteriaResults: result.rubricCriteriaResults,
          evidence: result.evidence,
          feedback: result.feedback,
        },
      })
    ),
    prisma.sessionAttempt.update({
      where: { id: sessionAttemptId },
      data: {
        status: "SCORED",
        submittedAt: submission.submittedAt,
        scoredAt: new Date(),
        sessionScore,
        badgeTier,
        passed: sessionScore >= sessionAttempt.patientSession.goldThreshold,
        clinicalScoreDetails: {
          source_submission_id: submission.id,
          source_conversation_id: submission.conversationId,
          achievement_results: achievementResults,
        },
      },
    }),
    prisma.badgeAward.upsert({
      where: {
        userId_patientSessionId_sessionAttemptId: {
          userId: sessionAttempt.userId,
          patientSessionId: sessionAttempt.patientSessionId,
          sessionAttemptId,
        },
      },
      create: {
        userId: sessionAttempt.userId,
        patientSessionId: sessionAttempt.patientSessionId,
        sessionAttemptId,
        tier: badgeTier,
        score: sessionScore,
      },
      update: {
        tier: badgeTier,
        score: sessionScore,
      },
    }),
    prisma.sessionFeedback.upsert({
      where: { sessionAttemptId },
      create: {
        sessionAttemptId,
        ...feedback,
      },
      update: feedback,
    }),
  ]);

  return {
    sessionAttemptId,
    sessionScore,
    badgeTier,
    achievementResults,
    debrief: buildSessionDebriefPayload({
      sessionAttemptId,
      sessionScore,
      badgeTier,
      achievementResults,
      achievements: sessionAttempt.patientSession.achievements,
      feedback,
    }),
  };
}

async function getSessionDebriefForAttempt(sessionAttemptId) {
  if (!sessionAttemptId) return null;

  const sessionAttempt = await prisma.sessionAttempt.findUnique({
    where: { id: sessionAttemptId },
    include: {
      feedback: true,
      achievementResults: {
        include: {
          achievement: true,
        },
      },
    },
  });

  if (!sessionAttempt) return null;

  return buildSessionDebriefPayload({
    sessionAttemptId: sessionAttempt.id,
    sessionScore: sessionAttempt.sessionScore,
    badgeTier: sessionAttempt.badgeTier,
    achievementResults: sessionAttempt.achievementResults,
    achievements: sessionAttempt.achievementResults.map((result) => result.achievement),
    feedback: sessionAttempt.feedback,
  });
}

module.exports = {
  buildSessionDebriefPayload,
  createSessionAttemptForConversation,
  finalizeSessionAttemptFromSubmission,
  getSessionDebriefForAttempt,
  getOrCreateSessionAttemptForConversation,
  resolvePatientSessionForAttempt,
};
