// validates + sanitizes LLM rubric output before it affects scoring
// basically treat LLM output as untrusted input

function normalizeText(text) {
    return String(text || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function roundTo(value, decimals = 2) {
    const factor = 10 ** decimals;
    return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

// force numeric scores to a range [min, max]
function clamp(num, min, max) {
    const n = Number(num);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
}

function toStringArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) {
        return value.map((v) => String(v || "").trim()).filter(Boolean);
    }
    const s = String(value).trim();
    return s ? [s] : [];
}

// prevent long str + arr from llm output
function capStrings(arr, { maxItems = 3, maxLen = 180 } = {}) {
    return (arr || [])
        .slice(0, maxItems)
        .map((s) => String(s || "").trim())
        .filter(Boolean)
        .map((s) => (s.length > maxLen ? s.slice(0, maxLen) : s));
}

function capString(s, maxLen = 320) {
    const out = String(s || "").trim();
    return out.length > maxLen ? out.slice(0, maxLen) : out;
}

// normalize llm outputs into "met / partially_met / not_met"
function normalizeStatus(raw) {
    const s = normalizeText(raw);

    if (s === "met" || s === "yes") return "met";
    if (s === "missed" || s === "not met" || s === "not_met" || s === "no") return "not_met";
    if (s === "partial" || s === "partially met" || s === "partially_met") return "partially_met";

    return null;
}

/**
 * VALIDATOR!!
 * - verifies structure
 * - drops unknown ids
 * - clamps points
 * - enforces status/points consistency
 * - returns clean, safe results
 */

function validateAndNormalizeRubricLlmOutput(rawJson, criteriaList) {
    const errors = [];
    const normalizedResultsById = new Map();
    
    // quick lookup for max points per criterion
    const criteriaById = new Map(
        (criteriaList || [])
        .filter((c) => c && c.id)
        .map((c) => [String(c.id), { points: Number(c.points) || 0 }])
    );

    // structure check: 
    // { results: [ { id, status, earned_points?, evidence?, rationale? }, ... ] }
    if (!rawJson || typeof rawJson !== "object") {
        return { ok: false, normalizedResultsById, errors: ["LLM output is not a JSON object"] };
    }

    const rows = Array.isArray(rawJson.results) ? rawJson.results : null;
    if (!rows) {
        return { ok: false, normalizedResultsById, errors: ["LLM output missing results[] array"] };
    }

    for (const row of rows) {
        const id = String(row?.id || "").trim();
        if (!id) continue;

        // ignore any ids we didn't request
        const meta = criteriaById.get(id);
        if (!meta) {
            errors.push(`Unknown criterion id ignored: ${id}`);
            continue;
        }

        const maxPoints = Number(meta.points) || 0;

        const status = normalizeStatus(row?.status);
        if (!status) {
            errors.push(`Invalid status for ${id}`);
            continue;
        }

        // evidence: must be string[]
        const evidence = capStrings(toStringArray(row?.evidence), { maxItems: 3, maxLen: 180 });

        // rationale: short string
        const rationale = capString(row?.rationale, 320);

        // earned_points: clamp + enforce consistency with status rules
        let earned = Number(row?.earned_points);
        const hasEarned = Number.isFinite(earned);

        // points must be consistent with status
        if (status === "met") {
            earned = maxPoints;
        } else if (status === "not_met") {
            earned = 0;
        } else if (status === "partially_met") {
            if (!hasEarned) earned = maxPoints > 0 ? maxPoints / 2 : 0;

            earned = clamp(earned, 0, maxPoints);

            // keep partial strictly inside (0, max) when possible
            if (maxPoints > 0 && (earned === 0 || earned === maxPoints)) {
                earned = maxPoints / 2;
            }
        }

        earned = roundTo(clamp(earned, 0, maxPoints), 2);

        normalizedResultsById.set(id, {
            status,
            earned_points: earned,
            evidence,
            rationale
        });
    }

    return { ok: normalizedResultsById.size > 0, normalizedResultsById, errors };
}

module.exports = { validateAndNormalizeRubricLlmOutput };