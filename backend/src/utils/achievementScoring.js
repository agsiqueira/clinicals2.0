function toFiniteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function roundTo(value, decimals = 2) {
  const multiplier = 10 ** decimals;
  return Math.round(toFiniteNumber(value) * multiplier) / multiplier;
}

function normalizeCriterionIds(value) {
  return Array.isArray(value) ? value.filter((id) => typeof id === "string") : [];
}

function normalizeCriteriaResults(value) {
  return Array.isArray(value) ? value.filter((item) => item && typeof item.id === "string") : [];
}

function computeAchievementResult(achievement, criteriaResults) {
  const rubricCriterionIds = normalizeCriterionIds(achievement?.rubricCriterionIds);
  const criteria = normalizeCriteriaResults(criteriaResults).filter((criterion) =>
    rubricCriterionIds.includes(criterion.id)
  );

  const earnedPoints = criteria.reduce(
    (sum, criterion) => sum + toFiniteNumber(criterion.earned_points),
    0
  );
  const maxPoints = criteria.reduce((sum, criterion) => sum + toFiniteNumber(criterion.points), 0);
  const percentScore = maxPoints > 0 ? (earnedPoints / maxPoints) * 100 : 0;
  const weightPercent = toFiniteNumber(achievement?.weightPercent);
  const weightedScore = percentScore * (weightPercent / 100);

  return {
    achievementId: achievement.id,
    earnedPoints: roundTo(earnedPoints),
    maxPoints: roundTo(maxPoints),
    percentScore: roundTo(percentScore),
    weightedScore: roundTo(weightedScore),
    achieved: percentScore >= 84,
    rubricCriterionIds,
    rubricCriteriaResults: criteria,
    evidence: criteria.flatMap((criterion) => criterion.evidence || []),
    feedback: buildAchievementFeedback(criteria),
  };
}

function buildAchievementFeedback(criteria) {
  if (criteria.length === 0) {
    return "No mapped rubric criteria were found for this achievement.";
  }

  const missedLabels = criteria
    .filter((criterion) => toFiniteNumber(criterion.earned_points) < toFiniteNumber(criterion.points))
    .map((criterion) => criterion.label || criterion.id);

  if (missedLabels.length === 0) {
    return "Mapped rubric criteria were met.";
  }

  return `Review: ${missedLabels.join(", ")}`;
}

function computeAchievementResults(achievements, criteriaResults) {
  return (achievements || []).map((achievement) =>
    computeAchievementResult(achievement, criteriaResults)
  );
}

function computeSessionScore(achievementResults) {
  return roundTo(
    (achievementResults || []).reduce(
      (sum, achievementResult) => sum + toFiniteNumber(achievementResult.weightedScore),
      0
    )
  );
}

function determineBadgeTier(score) {
  const normalizedScore = toFiniteNumber(score);
  if (normalizedScore >= 84) return "GOLD";
  if (normalizedScore >= 50) return "SILVER";
  if (normalizedScore > 0) return "BRONZE";
  return "NONE";
}

module.exports = {
  computeAchievementResult,
  computeAchievementResults,
  computeSessionScore,
  determineBadgeTier,
};
