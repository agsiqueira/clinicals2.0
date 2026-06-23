const prisma = require("../db/prisma");
const {
  computeAchievementResults,
  computeSessionScore,
  determineBadgeTier,
} = require("../utils/achievementScoring");

async function findFirstPatientSession(caseRecordId) {
  return prisma.patientSession.findFirst({
    where: {
      caseId: caseRecordId,
      slug: "first-patient",
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

async function createSessionAttemptForConversation({ userId, caseRecordId, conversationId }) {
  const patientSession = await findFirstPatientSession(caseRecordId);
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

async function getOrCreateSessionAttemptForConversation(conversation) {
  if (!conversation) return null;

  const existing = await prisma.sessionAttempt.findUnique({
    where: { conversationId: conversation.id },
  });
  if (existing) return existing;

  return createSessionAttemptForConversation({
    userId: conversation.userId,
    caseRecordId: conversation.caseId,
    conversationId: conversation.id,
  });
}

function buildPlaceholderFeedback({ badgeTier, sessionScore, achievementResults }) {
  const achievedCount = achievementResults.filter((result) => result.achieved).length;
  const totalCount = achievementResults.length;
  const needsReview = achievementResults
    .filter((result) => !result.achieved)
    .map((result) => result.feedback)
    .filter(Boolean);

  return {
    recognition: `You completed the session and earned a ${badgeTier} result with a score of ${sessionScore}%.`,
    coaching:
      needsReview.length > 0
        ? needsReview.join(" ")
        : "Continue applying these skills consistently in future encounters.",
    encouragement: `You met ${achievedCount} of ${totalCount} mapped achievement targets. Keep practicing with intention.`,
    summary: `Session score: ${sessionScore}%. Badge tier: ${badgeTier}.`,
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
        ...buildPlaceholderFeedback({ badgeTier, sessionScore, achievementResults }),
      },
      update: buildPlaceholderFeedback({ badgeTier, sessionScore, achievementResults }),
    }),
  ]);

  return {
    sessionAttemptId,
    sessionScore,
    badgeTier,
    achievementResults,
  };
}

module.exports = {
  createSessionAttemptForConversation,
  finalizeSessionAttemptFromSubmission,
  getOrCreateSessionAttemptForConversation,
};
