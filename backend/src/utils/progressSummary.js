function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getSubmissionDetails(submission) {
  return submission && typeof submission.details === "object" && submission.details
    ? submission.details
    : {};
}

function getSubmissionEarnedPoints(submission) {
  const details = getSubmissionDetails(submission);
  const earnedPoints = toFiniteNumber(details.earned_points, NaN);
  if (Number.isFinite(earnedPoints)) {
    return Math.max(0, earnedPoints);
  }

  const availablePoints = toFiniteNumber(details.available_points, NaN);
  const score = toFiniteNumber(submission?.score, NaN);
  if (Number.isFinite(availablePoints) && Number.isFinite(score)) {
    return Math.max(0, Math.round((score / 100) * availablePoints));
  }

  return 0;
}

function getSubmissionAvailablePoints(submission) {
  const details = getSubmissionDetails(submission);
  return Math.max(0, toFiniteNumber(details.available_points, 0));
}

function calculateCasePointsAwarded({ level, earnedPoints }) {
  return Math.max(0, toFiniteNumber(level, 1) * Math.max(0, toFiniteNumber(earnedPoints, 0)));
}

function summarizeUserProgressFromConversations(conversations = []) {
  const bestByCase = new Map();

  for (const conversation of conversations) {
    const submission = conversation?.submission;
    const patientCase = conversation?.patientCase;
    if (!submission || !patientCase?.caseId) continue;

    const level = Math.max(1, toFiniteNumber(patientCase.level, 1));
    const earnedPoints = getSubmissionEarnedPoints(submission);
    const availablePoints = getSubmissionAvailablePoints(submission);
    const casePointsAwarded = calculateCasePointsAwarded({ level, earnedPoints });
    const score = Math.max(0, toFiniteNumber(submission.score, 0));
    const submittedAt = submission.submittedAt ? new Date(submission.submittedAt) : new Date(0);

    const nextEntry = {
      caseId: patientCase.caseId,
      title: patientCase.title,
      level,
      score,
      earnedPoints,
      availablePoints,
      casePointsAwarded,
      submittedAt: submittedAt.toISOString(),
    };

    const currentBest = bestByCase.get(patientCase.caseId);
    if (!currentBest) {
      bestByCase.set(patientCase.caseId, nextEntry);
      continue;
    }

    const shouldReplace =
      nextEntry.casePointsAwarded > currentBest.casePointsAwarded ||
      (nextEntry.casePointsAwarded === currentBest.casePointsAwarded &&
        new Date(nextEntry.submittedAt).getTime() > new Date(currentBest.submittedAt).getTime());

    if (shouldReplace) {
      bestByCase.set(patientCase.caseId, nextEntry);
    }
  }

  const bestCases = Array.from(bestByCase.values()).sort((a, b) => a.caseId.localeCompare(b.caseId));
  const totalPoints = bestCases.reduce((sum, entry) => sum + entry.casePointsAwarded, 0);
  const level = Math.max(1, Math.floor(totalPoints / 100) + 1);

  return {
    totalPoints,
    level,
    bestCases,
  };
}

module.exports = {
  calculateCasePointsAwarded,
  getSubmissionAvailablePoints,
  getSubmissionEarnedPoints,
  summarizeUserProgressFromConversations,
};
