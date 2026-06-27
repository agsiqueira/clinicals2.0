const { COMPETENCY_DEFINITIONS } = require("../config/competencies");
const { OBJECTIVE_COMPETENCY_MAPPINGS } = require("../config/objectiveCompetencies");

function envFlagEnabled(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

function normalizeObjectiveId(value) {
  return String(value || "").trim();
}

function activeCompetencyIds() {
  return new Set(getCompetencies().map((competency) => competency.id));
}

function getCompetencies({ includeInactive = false } = {}) {
  const definitions = includeInactive
    ? COMPETENCY_DEFINITIONS
    : COMPETENCY_DEFINITIONS.filter((competency) => competency.active);

  return [...definitions].sort((a, b) => a.displayOrder - b.displayOrder);
}

function getObjectiveCompetencies(objectiveId) {
  const objectiveKey = normalizeObjectiveId(objectiveId);
  const activeIds = activeCompetencyIds();
  return (OBJECTIVE_COMPETENCY_MAPPINGS[objectiveKey] || []).filter((mapping) =>
    activeIds.has(mapping.competencyId)
  );
}

function getPrimaryCompetencies(session) {
  return Array.isArray(session?.primaryCompetencies) ? session.primaryCompetencies : [];
}

function getSecondaryCompetencies(session) {
  return Array.isArray(session?.secondaryCompetencies) ? session.secondaryCompetencies : [];
}

function buildCompetencyEvidence({
  studentId,
  sessionId,
  attemptId,
  evaluatedObjectives,
  objectives,
  timestamp = new Date(),
}) {
  const objectivesById = new Map((objectives || []).map((objective) => [objective.id, objective]));
  const timestampValue =
    timestamp instanceof Date ? timestamp.toISOString() : new Date(timestamp || Date.now()).toISOString();

  return (evaluatedObjectives || []).flatMap((result) => {
    const objective = objectivesById.get(result.achievementId || result.objectiveId);
    const objectiveId = result.objectiveId || result.achievementId;
    const objectiveKey = normalizeObjectiveId(objective?.slug || result.objectiveKey || objectiveId);
    const mappings = getObjectiveCompetencies(objectiveKey);

    return mappings.map((mapping) => ({
      studentId,
      sessionId,
      attemptId,
      competencyId: mapping.competencyId,
      objectiveId,
      objectiveKey,
      weight: mapping.weight,
      achieved: Boolean(result.achieved),
      percentScore: result.percentScore ?? null,
      timestamp: timestampValue,
    }));
  });
}

function summarizeCompetencyEvidence(evidence) {
  const competencyNames = new Map(getCompetencies().map((competency) => [competency.id, competency.name]));
  const summaries = new Map();

  (evidence || []).forEach((item) => {
    const existing = summaries.get(item.competencyId) || {
      competencyId: item.competencyId,
      name: competencyNames.get(item.competencyId) || item.competencyId,
      achievedWeight: 0,
      possibleWeight: 0,
      evidenceCount: 0,
    };
    const weight = Number(item.weight) || 0;
    existing.possibleWeight += weight;
    existing.achievedWeight += item.achieved ? weight : 0;
    existing.evidenceCount += 1;
    summaries.set(item.competencyId, existing);
  });

  return Array.from(summaries.values()).sort((a, b) =>
    String(a.name).localeCompare(String(b.name))
  );
}

function debugLogCompetencyEvidence({ session, evidence }) {
  if (process.env.NODE_ENV === "production") return;
  if (!envFlagEnabled(process.env.ENABLE_COMPETENCY_DEBUG)) return;

  const summaries = summarizeCompetencyEvidence(evidence);
  console.log("[competency] Session:", session?.title || session?.slug || session?.id || "Unknown session");
  console.log("[competency] Competency Evidence");

  if (summaries.length === 0) {
    console.log("[competency] No mapped competency evidence generated.");
    return;
  }

  summaries.forEach((summary) => {
    console.log(`[competency] ${summary.name} +${summary.achievedWeight}`);
  });
}

// Sprint 1 hook: generate evidence for future learner-model use, but do not
// persist, score from, or expose it. Later sprints can replace this return value
// with StudentCompetency aggregation without changing the grading pipeline.
function evaluateCompetencyEvidence({
  studentId,
  session,
  attemptId,
  evaluatedObjectives,
  objectives,
  timestamp,
}) {
  const evidence = buildCompetencyEvidence({
    studentId,
    sessionId: session?.id,
    attemptId,
    evaluatedObjectives,
    objectives,
    timestamp,
  });

  debugLogCompetencyEvidence({ session, evidence });
  return {
    primaryCompetencies: getPrimaryCompetencies(session),
    secondaryCompetencies: getSecondaryCompetencies(session),
    evidence,
    summary: summarizeCompetencyEvidence(evidence),
  };
}

module.exports = {
  buildCompetencyEvidence,
  debugLogCompetencyEvidence,
  evaluateCompetencyEvidence,
  getCompetencies,
  getObjectiveCompetencies,
  getPrimaryCompetencies,
  getSecondaryCompetencies,
  summarizeCompetencyEvidence,
};
