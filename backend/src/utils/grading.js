const { createRubricEval } = require("../llm/navigatorClient");
const { expandCriteriaWithCommon } = require("./rubricCommon");
const { validateAndNormalizeRubricLlmOutput } = require("./llmRubricSchema");

function envFlagEnabled(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

const GRADING_DEBUG = envFlagEnabled(process.env.GRADING_DEBUG);
const GRADING_LLM_DISABLED = envFlagEnabled(process.env.GRADING_LLM_DISABLED);

function debugLog(...args) {
  if (!GRADING_DEBUG) return;
  console.log("[grading]", ...args);
}

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKeywords(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input
      .map((item) => normalizeText(item))
      .filter((item) => item.length > 0);
  }
  const keyword = normalizeText(input);
  return keyword ? [keyword] : [];
}

function normalizeKeywordGroups(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map((group) => normalizeKeywords(group))
    .filter((group) => group.length > 0);
}

function normalizeOverrideMap(map) {
  if (!map || typeof map !== "object") return {};
  const normalized = {};
  Object.entries(map).forEach(([key, value]) => {
    normalized[normalizeText(key)] = value;
  });
  return normalized;
}

function keywordsFromPhrase(phrase) {
  return normalizeText(phrase)
    .split(/\s+/)
    .filter((word) => word.length >= 4);
}

function includesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function roundTo(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function normalizeSupplementalInputs(supplementalInputs) {
  if (!supplementalInputs || typeof supplementalInputs !== "object") {
    return {};
  }

  const normalized = {};
  Object.entries(supplementalInputs).forEach(([key, value]) => {
    const sourceKey = String(key || "").trim().toLowerCase();
    if (!sourceKey) return;

    const text = String(value || "").trim();
    if (!text) return;

    normalized[sourceKey] = text;
  });

  return normalized;
}

function collectRawTextBySource(conversation, source, supplementalInputs = {}) {
  const target = source || "user";

  if (typeof target === "string") {
    const sourceKey = target.trim().toLowerCase();
    if (sourceKey && sourceKey !== "all" && sourceKey in supplementalInputs) {
      return String(supplementalInputs[sourceKey] || "").trim();
    }
  }

  if (target === "all") {
    return (conversation || [])
      .map((message) => String(message?.content || "").trim())
      .filter(Boolean)
      .join(" ");
  }

  const allowedRoles = Array.isArray(target) ? target : [target];
  const roleSet = new Set(allowedRoles.map((role) => String(role).toLowerCase()));

  return (conversation || [])
    .filter((message) => message && roleSet.has(String(message.role || "").toLowerCase()))
    .map((message) => String(message.content || "").trim())
    .filter(Boolean)
    .join(" ");
}

function collectTextBySource(conversation, source, supplementalInputs = {}) {
  return normalizeText(collectRawTextBySource(conversation, source, supplementalInputs));
}

function evaluateRule(text, rule) {
  const anyKeywords = normalizeKeywords(rule?.any);
  const allKeywords = normalizeKeywords(rule?.all);
  const groups = normalizeKeywordGroups(rule?.groups);

  const evidence = [];

  if (allKeywords.length > 0) {
    for (const keyword of allKeywords) {
      if (!text.includes(keyword)) {
        return { matched: false, evidence: [] };
      }
      evidence.push(keyword);
    }
  }

  if (anyKeywords.length > 0) {
    const matchedAny = anyKeywords.filter((keyword) => text.includes(keyword));
    if (matchedAny.length === 0) {
      return { matched: false, evidence: [] };
    }
    evidence.push(...matchedAny.slice(0, 3));
  }

    if (groups.length > 0) {
    const minGroupsMatchedRaw = rule?.min_groups_matched;
    const minGroupsMatched = Number.isFinite(Number(minGroupsMatchedRaw))
      ? Number(minGroupsMatchedRaw)
      : null;

    let matchedCount = 0;

    for (const group of groups) {
      const matched = group.find((keyword) => text.includes(keyword));

      if (matched) {
        matchedCount += 1;
        evidence.push(matched);
      } else if (minGroupsMatched === null) {
        // require ALL groups unless a threshold is specified
        return { matched: false, evidence: [] };
      }
    }

    // if threshold specified, require at least that many groups to match
    if (minGroupsMatched !== null && matchedCount < minGroupsMatched) {
      return { matched: false, evidence: [] };
    }
  }

  if (allKeywords.length === 0 && anyKeywords.length === 0 && groups.length === 0) {
    return { matched: false, evidence: [] };
  }

  return { matched: true, evidence: [...new Set(evidence)].slice(0, 5) };
}

function extractJsonObject(text) {
  if (!text) return null;

  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("Failed to parse LLM rubric JSON response.");
    debugLog("JSON parse error:", err);
    return null;
  }
}

function buildConversationTranscript(conversation) {
  return (conversation || [])
    .map((message, idx) => {
      const role = String(message?.role || "unknown").toUpperCase();
      const content = String(message?.content || "").trim();
      return `${idx + 1}. ${role}: ${content}`;
    })
    .join("\n");
}

function describeRuleForLlm(rule) {
  const anyKeywords = normalizeKeywords(rule?.any);
  const allKeywords = normalizeKeywords(rule?.all);
  const groups = normalizeKeywordGroups(rule?.groups);
  const parts = [];

  if (allKeywords.length) {
    parts.push(`Must include all concepts: ${allKeywords.join(", ")}`);
  }
  if (anyKeywords.length) {
    parts.push(`Can match any of: ${anyKeywords.join(", ")}`);
  }
  if (groups.length) {
    const groupSummary = groups.map((group) => `[${group.join(", ")}]`).join(" + ");
    parts.push(`For each group, mention at least one concept: ${groupSummary}`);
  }

  return parts.join(" ");
}

// calls LLM to evaluate rubric criteria and validates its output
async function evaluateCriteriaWithLlm({ caseData, criteria, conversation, supplementalInputs }) {
  // only LLM-enabled criteria
  const llmCriteria = criteria.filter(
    (criterion) =>
      criterion.enabled !== false &&
      (criterion.mode === "llm" || criterion.mode === "llm_or_rule")
  );

  if (!llmCriteria.length) {
    debugLog("No LLM criteria enabled; skipping model rubric evaluation.");
    return new Map();
  }

  debugLog(
    `Evaluating ${llmCriteria.length} LLM criteria for case ${caseData?.case_id || "unknown"}.`
  );

  const criteriaPrompt = llmCriteria
    .map((criterion) => {
      const source = criterion.source || "user";
      const guidance =
        criterion.prompt_hint ||
        criterion.description ||
        describeRuleForLlm(criterion.rule || criterion.fallback_rule);
      const guidanceLine = guidance ? `\n  guidance: ${guidance}` : "";
      return `- id: ${criterion.id}\n  label: ${
        criterion.label || criterion.id
      }\n  points: ${Number(criterion.points) || 0}\n  source: ${source}${guidanceLine}`;
    })
    .join("\n");

  const transcript = buildConversationTranscript(conversation);
  const sourceViews = {
    user: collectRawTextBySource(conversation, "user", supplementalInputs),
    assistant: collectRawTextBySource(conversation, "assistant", supplementalInputs),
    all: collectRawTextBySource(conversation, "all", supplementalInputs)
  };

  const sourceViewBlock = Object.entries(sourceViews)
    .map(([source, text]) => `- source: ${source}\n  text: ${String(text || "").trim() || "(none)"}`)
    .join("\n");

  const supplementalInputBlock = Object.entries(supplementalInputs || {})
    .map(([source, text]) => `- source: ${source}\n  text: ${String(text || "").trim()}`)
    .join("\n");
    
  // prevent free-form responses
  const systemPrompt = `
    You are a strict clinical OSCE rubric grader.

    Evaluate each criterion using ONLY the provided transcript and supplemental inputs.
    Do NOT infer missing information.
    If not explicitly stated, mark as "not_met".

    Source handling:
    - If criterion source is user/assistant/all, use the Transcript section.
    - If criterion source is a custom source (example: hpi), use matching text from Supplemental Inputs.

    Return STRICT JSON only.
    No markdown.
    No commentary.
    No extra keys.

    You MUST return this exact schema:

    {
      "results": [
        {
          "id": "criterion_id",
          "status": "met | partially_met | not_met",
          "earned_points": number,
          "evidence": ["exact quote from transcript"],
          "rationale": "brief reason"
        }
      ]
    }

    Rules:
    - Include ALL criteria listed.
    - Do NOT invent ids.
    - Respect each criterion's source strictly:
      - source=user -> use student/user text only.
      - source=assistant -> use patient/assistant text only.
      - source=all -> use full transcript.
      - custom sources (e.g., hpi) -> use matching Supplemental Inputs text only.
    - Evidence quotes must come from that criterion's source text only.
    - For status met/partially_met, include 1-2 short exact quotes from source text.
    - If you cannot quote source text for that criterion, mark not_met.
    - earned_points must be 0 if status is not_met.
    - earned_points must equal full points if status is met.
    - partially_met must be between 0 and full points.
  `;

  const userPrompt = [
    `Case ID: ${caseData?.case_id || "unknown"}`,
    "Criteria:",
    criteriaPrompt,
    "Source Views:",
    sourceViewBlock,
    "Transcript:",
    transcript,
    "Supplemental Inputs:",
    supplementalInputBlock || "- none"
  ].join("\n\n");

  try {
    const response = await createRubricEval({ systemPrompt, userPrompt });
    const parsed = extractJsonObject(response);
    debugLog("Parsed LLM rubric payload:", parsed);

    if (!parsed) {
      console.error("LLM rubric response was not valid JSON; falling back.");
      debugLog("Raw LLM response:", response);
    }

    const { ok, normalizedResultsById, errors } =
      validateAndNormalizeRubricLlmOutput(parsed, llmCriteria);

    if (!ok) {
      console.error("LLM rubric output failed validation; falling back.");
      debugLog("LLM rubric validation errors:", errors);
      // choose:
      // - return new Map() to force llm_or_rule to fallback to rules -> this one - safer, but strictrer
      // - OR keep partial results (normalizedResultsById) -> more forgiving, but risks LLM errors causing false positives
      return new Map();
    }

    return normalizedResultsById;

  } catch (err) {
    console.error("Error evaluating LLM criteria:", err);
    return new Map();
  }
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags.map((tag) => normalizeText(tag)).filter(Boolean);
}

function getPenaltyIfMissed(criterion) {
  const value = Number(criterion?.penalty_if_missed);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function applyMissedPenalty(result, criterion) {
  if (!result || result.status === "omitted") return result;

  const penalty = getPenaltyIfMissed(criterion);
  if (!penalty || result.status !== "missed") return result;

  const earned = Number(result.earned_points) || 0;
  const nextEarned = roundTo(earned - penalty);
  const penaltyText = `Penalty applied: -${penalty} point${penalty === 1 ? "" : "s"}.`;

  return {
    ...result,
    earned_points: nextEarned,
    rationale: result.rationale ? `${result.rationale} ${penaltyText}` : penaltyText
  };
}

function llmStatusNeedsEvidence(status) {
  return status === "met" || status === "partially_met";
}

function normalizeEvidenceList(evidenceList) {
  if (!Array.isArray(evidenceList)) return [];
  return evidenceList
    .map((snippet) => String(snippet || "").trim())
    .filter(Boolean)
    .slice(0, 6);
}

function splitEvidenceBySourceMatch(sourceText, evidenceList) {
  const normalizedSource = normalizeText(sourceText);
  const evidence = normalizeEvidenceList(evidenceList);
  const matched = [];
  const unmatched = [];

  if (!normalizedSource || evidence.length === 0) {
    return { matched, unmatched: evidence };
  }

  evidence.forEach((snippet) => {
    const normalizedSnippet = normalizeText(snippet);
    // Ignore tiny tokens that can falsely match almost anything.
    if (normalizedSnippet.length < 6) return;

    if (normalizedSource.includes(normalizedSnippet)) {
      matched.push(snippet);
    } else {
      unmatched.push(snippet);
    }
  });

  return { matched, unmatched };
}

function llmResultMatchesCriterionSource(llmResult, sourceText) {
  const status = llmResult?.status;
  if (!llmStatusNeedsEvidence(status)) {
    return { ok: true, matchedEvidence: normalizeEvidenceList(llmResult?.evidence), reason: null };
  }

  const { matched, unmatched } = splitEvidenceBySourceMatch(sourceText, llmResult?.evidence);

  if (matched.length === 0) {
    return {
      ok: false,
      matchedEvidence: [],
      reason: "no evidence quotes found in criterion source text"
    };
  }

  if (unmatched.length > 0) {
    return {
      ok: false,
      matchedEvidence: matched,
      reason: "some evidence quotes were outside the criterion source text"
    };
  }

  return { ok: true, matchedEvidence: matched, reason: null };
}

function evaluateCriterion(conversation, criterion, llmResults, supplementalInputs) {
  const enabled = criterion.enabled !== false;
  const tags = normalizeTags(criterion.tags);
  const points = Number(criterion.points) || 0;
  const finalize = (result) => applyMissedPenalty(result, criterion);

  if (!enabled) {
    return finalize({
      id: criterion.id,
      section: criterion.section,
      label: criterion.label || criterion.id,
      tags,
      points,
      earned_points: 0,
      status: "omitted",
      omit_reason: criterion.omit_reason || "Marked not applicable for this case",
      evidence: [],
      rationale: null
    });
  }

  const mode = criterion.mode || "rule";
  const text = collectTextBySource(conversation, criterion.source || "user", supplementalInputs);

  if (mode === "llm" || mode === "llm_or_rule") {
    let llmDiscardReason = null;

    if (llmResults?.has(criterion.id)) {
      const llm = llmResults.get(criterion.id);
      const sourceCheck = llmResultMatchesCriterionSource(llm, text);

      // Strict guard: ignore LLM "met/partial" if evidence is not from the
      // criterion's declared source text (e.g., user-only criteria must cite
      // student utterances, not patient responses).
      if (!sourceCheck.ok) {
        llmDiscardReason = sourceCheck.reason || "evidence/source mismatch";
        debugLog(
          `Discarding LLM result for ${criterion.id}: ${llmDiscardReason} (source "${
            criterion.source || "user"
          }").`
        );
      } else {
        const status =
          llm.status === "met"
            ? "met"
            : llm.status === "partially_met"
            ? "partially_met"
            : "missed"; // not_met -> missed 

        return finalize({
          id: criterion.id,
          section: criterion.section,
          label: criterion.label || criterion.id,
          tags,
          points,
          earned_points: Number(llm.earned_points) || 0,
          status,
          omit_reason: null,
          evidence: sourceCheck.matchedEvidence,
          rationale: llm.rationale || null
        });
      }

    }

    // missing LLM result -> fallback behavior
    if (mode === "llm_or_rule") {
      const fallbackRule = criterion.fallback_rule || criterion.rule || {};
      const ruleResult = evaluateRule(text, fallbackRule);

      return finalize({
        id: criterion.id,
        section: criterion.section,
        label: criterion.label || criterion.id,
        tags,
        points,
        earned_points: ruleResult.matched ? points : 0,
        status: ruleResult.matched ? "met" : "missed",
        omit_reason: null,
        evidence: ruleResult.evidence,
        rationale: llmDiscardReason
          ? `Fallback rule used (${llmDiscardReason}).`
          : "Fallback rule used (LLM missing result)."
      });
    }

    // mode === "llm" only
    return finalize({
      id: criterion.id,
      section: criterion.section,
      label: criterion.label || criterion.id,
      tags,
      points,
      earned_points: 0,
      status: "missed",
      omit_reason: null,
      evidence: [],
      rationale: llmDiscardReason || "LLM missing result."
    });
  }

  // rule-only path
  const fallbackRule = criterion.fallback_rule || criterion.rule || {};
  const ruleResult = evaluateRule(text, fallbackRule);

  return finalize({
    id: criterion.id,
    section: criterion.section,
    label: criterion.label || criterion.id,
    tags,
    points,
    earned_points: ruleResult.matched ? points : 0,
    status: ruleResult.matched ? "met" : "missed",
    omit_reason: null,
    evidence: ruleResult.evidence,
    rationale: null
  });
}

function summarizeSections(sectionDefs, criterionResults) {
  const sectionMap = new Map();

  (sectionDefs || []).forEach((section) => {
    if (!section || !section.id) return;
    sectionMap.set(section.id, {
      section: section.id,
      label: section.label || section.id,
      earned_points: 0,
      available_points: 0,
      total_points: 0
    });
  });

  criterionResults.forEach((result) => {
    const key = result.section || "other";
    if (!sectionMap.has(key)) {
      sectionMap.set(key, {
        section: key,
        label: key,
        earned_points: 0,
        available_points: 0,
        total_points: 0
      });
    }

    const section = sectionMap.get(key);
    section.total_points += result.points;
    if (result.status !== "omitted") {
      section.available_points += result.points;
      section.earned_points += result.earned_points;
    }
  });

  const orderedIds = (sectionDefs || []).map((section) => section.id);
  const extraIds = Array.from(sectionMap.keys()).filter((id) => !orderedIds.includes(id));

  return [...orderedIds, ...extraIds].map((id) => sectionMap.get(id));
}

function findMissedByTag(criteriaResults, tag) {
  const normalizedTag = normalizeText(tag);
  return criteriaResults
    .filter(
      (criterion) =>
        // partial == “missed” for required/red-flag lists
        (criterion.status === "missed" || criterion.status === "partially_met") &&
        Array.isArray(criterion.tags) &&
        criterion.tags.includes(normalizedTag)
    )
    .map((criterion) => criterion.label);
}

function matchTextItem(text, item, overrideMap) {
  const key = normalizeText(item);
  const custom = normalizeKeywords(overrideMap?.[key]);
  const keywords = custom.length ? custom : keywordsFromPhrase(item);
  return keywords.length > 0 && includesAny(text, keywords);
}

function gradeWithoutRubric({ caseData, gradingData, conversation }) {
  const keywordOverrides = gradingData.keyword_overrides || {};
  const historyOverrides = normalizeOverrideMap(keywordOverrides.history_topics);
  const actionOverrides = normalizeOverrideMap(keywordOverrides.actions);
  const redFlagOverrides = normalizeOverrideMap(keywordOverrides.red_flags);
  const criticalOverrides = normalizeOverrideMap(keywordOverrides.critical_fails);

  const historyTopics = gradingData.required_history_topics || [];
  const actions = gradingData.required_actions || [];
  const criticalFails = gradingData.critical_fails || [];
  const redFlags = caseData?.hidden_truth?.red_flags || [];

  const userText = collectTextBySource(conversation, "user");

  const coveredHistoryCount = historyTopics.filter((topic) =>
    matchTextItem(userText, topic, historyOverrides)
  ).length;
  const coveredActionsCount = actions.filter((action) =>
    matchTextItem(userText, action, actionOverrides)
  ).length;

  const missedRequiredQuestions = historyTopics.filter(
    (topic) => !matchTextItem(userText, topic, historyOverrides)
  );

  const missedRedFlags = redFlags.filter(
    (flag) => !matchTextItem(userText, flag, redFlagOverrides)
  );

  const criticalFailsTriggered = criticalFails.filter(
    (criterion) => !matchTextItem(userText, criterion, criticalOverrides)
  );

  const scoring = gradingData.scoring || {};
  const historyPoints = Number(scoring.history_topic_points) || 0;
  const actionPoints = Number(scoring.action_points) || 0;
  const criticalPenalty = Number(scoring.critical_fail_penalty) || 0;

  let score = 0;
  score += coveredHistoryCount * historyPoints;
  score += coveredActionsCount * actionPoints;
  score -= criticalFailsTriggered.length * criticalPenalty;

  if (score < 0) score = 0;
  if (score > 100) score = 100;

  const passingScore = Number(scoring.passing_score) || 84;
  const passed = score >= passingScore;

  const feedbackParts = [
    `Legacy checklist score: ${score}%`,
    `Passing threshold: ${passingScore}%.`,
    `History topics covered: ${coveredHistoryCount}/${historyTopics.length}.`,
    `Actions covered: ${coveredActionsCount}/${actions.length}.`
  ];

  if (missedRequiredQuestions.length) {
    feedbackParts.push(`Missed history topics: ${missedRequiredQuestions.join(", ")}.`);
  }
  if (missedRedFlags.length) {
    feedbackParts.push(`Missed red flags: ${missedRedFlags.join(", ")}.`);
  }
  if (criticalFailsTriggered.length) {
    feedbackParts.push(`Critical fails: ${criticalFailsTriggered.join(", ")}.`);
  }

  return {
    score,
    passing_score: passingScore,
    passed,
    can_unlock_next_case: passed,
    earned_points: null,
    available_points: null,
    total_points: null,
    omitted_points: 0,
    section_scores: [],
    criteria_results: [],
    missed_required_questions: missedRequiredQuestions,
    missed_red_flags: missedRedFlags,
    critical_fails_triggered: criticalFailsTriggered,
    feedback: feedbackParts.join(" ")
  };
}

async function gradeWithRubric({ caseData, gradingData, conversation, supplementalInputs }) {
  const rubric = gradingData.rubric || {};
  const criteria = expandCriteriaWithCommon(rubric);
  const sectionDefs = Array.isArray(rubric.sections) ? rubric.sections : [];

  const llmResults = GRADING_LLM_DISABLED
    ? new Map()
    : await evaluateCriteriaWithLlm({
        caseData,
        criteria,
        conversation,
        supplementalInputs
      });

  const criteriaResults = criteria.map((criterion) =>
    evaluateCriterion(conversation, criterion, llmResults, supplementalInputs)
  );

  const sectionScores = summarizeSections(sectionDefs, criteriaResults);

  const totalPoints = criteriaResults.reduce((sum, item) => sum + item.points, 0);
  const availablePoints = criteriaResults
    .filter((item) => item.status !== "omitted")
    .reduce((sum, item) => sum + item.points, 0);
  const earnedPoints = criteriaResults.reduce((sum, item) => sum + item.earned_points, 0);
  const omittedPoints = totalPoints - availablePoints;

  const rawScore = availablePoints > 0 ? Math.round((earnedPoints / availablePoints) * 100) : 0;
  const score = Math.min(100, Math.max(0, rawScore));
  const passingScore = Number(rubric.passing_score || gradingData?.scoring?.passing_score || 84);
  const passed = score >= passingScore;

  const missedRequiredQuestions = findMissedByTag(criteriaResults, "required_history");
  const missedRedFlags = findMissedByTag(criteriaResults, "red_flag");
  const criticalFailsTriggered = findMissedByTag(criteriaResults, "critical_fail");

  const feedbackParts = [
    `CPI rubric score: ${score}% (${earnedPoints}/${availablePoints} available points).`,
    `Passing threshold: ${passingScore}%.`
  ];

  if (omittedPoints > 0) {
    feedbackParts.push(`Omitted criteria points removed from denominator: ${omittedPoints}.`);
  }

  const missedCount = criteriaResults.filter((item) => item.status === "missed").length;
  feedbackParts.push(`Criteria met: ${criteriaResults.length - missedCount}/${criteriaResults.length}.`);

  if (missedRequiredQuestions.length > 0) {
    feedbackParts.push(`Missed required history items: ${missedRequiredQuestions.join(", ")}.`);
  }
  if (missedRedFlags.length > 0) {
    feedbackParts.push(`Missed red flags: ${missedRedFlags.join(", ")}.`);
  }
  if (criticalFailsTriggered.length > 0) {
    feedbackParts.push(`Critical fails: ${criticalFailsTriggered.join(", ")}.`);
  }

  return {
    score,
    passing_score: passingScore,
    passed,
    can_unlock_next_case: passed,
    earned_points: roundTo(earnedPoints),
    available_points: roundTo(availablePoints),
    total_points: roundTo(totalPoints),
    omitted_points: roundTo(omittedPoints),
    section_scores: sectionScores.map((section) => ({
      ...section,
      earned_points: roundTo(section.earned_points),
      available_points: roundTo(section.available_points),
      total_points: roundTo(section.total_points)
    })),
    criteria_results: criteriaResults,
    missed_required_questions: missedRequiredQuestions,
    missed_red_flags: missedRedFlags,
    critical_fails_triggered: criticalFailsTriggered,
    feedback: feedbackParts.join(" ")
  };
}

async function gradeConversation({ caseData, gradingData, conversation, supplementalInputs }) {
  const safeConversation = Array.isArray(conversation) ? conversation : [];
  const safeSupplementalInputs = normalizeSupplementalInputs(supplementalInputs);

  if (gradingData?.rubric?.criteria?.length || gradingData?.rubric?.common_criteria?.length) {
    return gradeWithRubric({
      caseData,
      gradingData,
      conversation: safeConversation,
      supplementalInputs: safeSupplementalInputs
    });
  }

  return gradeWithoutRubric({ caseData, gradingData, conversation: safeConversation });
}

module.exports = { gradeConversation };
