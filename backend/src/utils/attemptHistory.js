function buildAttemptSummaries(conversations) {
  if (!Array.isArray(conversations) || conversations.length === 0) {
    return [];
  }

  return conversations.map((conversation, index) => ({
    conversationId: conversation.id,
    submittedAt: conversation.submittedAt,
    score: conversation.submission?.score ?? null,
    passed: conversation.submission?.details?.passed ?? null,
    attemptNumber: conversations.length - index,
  }));
}

module.exports = {
  buildAttemptSummaries,
};
