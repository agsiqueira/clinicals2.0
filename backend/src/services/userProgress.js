const prisma = require("../db/prisma");
const { summarizeUserProgressFromConversations } = require("../utils/progressSummary");

async function buildUserProgressSummary(userId) {
  const conversations = await prisma.conversation.findMany({
    where: {
      userId,
      submission: {
        isNot: null,
      },
    },
    include: {
      patientCase: true,
      submission: true,
    },
    orderBy: {
      submittedAt: "desc",
    },
  });

  return summarizeUserProgressFromConversations(conversations);
}

async function syncUserProgress(userId) {
  const summary = await buildUserProgressSummary(userId);

  await prisma.userProgress.upsert({
    where: { userId },
    create: {
      userId,
      xp: summary.totalPoints,
      level: summary.level,
    },
    update: {
      xp: summary.totalPoints,
      level: summary.level,
    },
  });

  return summary;
}

module.exports = {
  buildUserProgressSummary,
  syncUserProgress,
};
