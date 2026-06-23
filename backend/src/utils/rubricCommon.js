function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

const COMMON_CRITERIA = {
  professional_intro_name: {
    id: "professional_intro_name",
    section: "professional",
    label: "Introduces self by name",
    prompt_hint:
      "Award only if the user/clinician (not the patient) explicitly introduces themselves by name (for example: 'My name is ...').",
    points: 0.5,
    source: "user",
    tags: ["professional"],
    mode: "llm_or_rule",
    fallback_rule: {
      any: ["my name is", "my name", "i am", "i'm", "im", "this is"]
    }
  },
  professional_intro_role_title: {
    id: "professional_intro_role_title",
    section: "professional",
    label: "States professional role/title",
    prompt_hint:
      "Award only if the user/clinician (not the patient) explicitly states their clinical/professional role or title (for example: medical student, doctor, NP student, APRN, physician assistant).",
    points: 0.5,
    source: "user",
    tags: ["professional"],
    mode: "llm_or_rule",
    fallback_rule: {
      any: [
        "dnp student",
        "np student",
        "medical student",
        "uf medical student",
        "student doctor",
        "student physician",
        "pa student",
        "physician assistant student",
        "nursing student",
        "nurse practitioner student",
        "nurse practitioner",
        "family nurse practitioner",
        "fnp",
        "aprn",
        "provider",
        "md",
        "doctor",
        "physician"
      ]
    }
  },
  professional_preferred_name: {
    id: "professional_preferred_name",
    section: "professional",
    label: "Asks preferred name",
    prompt_hint: "The user/clinician (not the patient) asks how the patient prefers to be addressed.",
    points: 1,
    source: "user",
    tags: ["professional"],
    mode: "rule",
    rule: {
      any: ["may i call you", "preferred name", "what name do you prefer", "can i call you"]
    }
  },
  professional_opening_question: {
    id: "professional_opening_question",
    section: "professional",
    label: "Asks opening question",
    prompt_hint:
      "The user/clinician (not the patient) invites the chief complaint with an opening question (for example, what brings you in today).",
    points: 1,
    source: "user",
    tags: ["professional"],
    mode: "llm",
    fallback_rule: {
      any: [
        "how can i help you today",
        "what brings you in today",
        "what brings you today",
        "what brings you in"
      ]
    }
  },
  professional_identity_two_identifiers: {
    id: "professional_identity_two_identifiers",
    section: "professional",
    label: "Confirms patient identity using two identifiers",
    prompt_hint:
      "The user/clinician (not the patient) verifies identity with at least two identifiers, including name and date of birth.",
    points: 1,
    source: "user",
    mode: "llm_or_rule",
    tags: ["professional"],
    fallback_rule: {
      groups: [
        ["full name", "name and date of birth", "your name", "confirm your name", "verify your name"],
        [
          "date of birth",
          "dob",
          "birth date",
          "birthday",
          "month and day of birth",
          "identifier"
        ]
      ]
    }
  }
};

function mergeCriterionWithOverride(baseCriterion, override) {
  const merged = {
    ...baseCriterion,
    ...override
  };

  if (baseCriterion.rule || override.rule) {
    merged.rule = {
      ...(baseCriterion.rule || {}),
      ...(override.rule || {})
    };
  }

  if (baseCriterion.fallback_rule || override.fallback_rule) {
    merged.fallback_rule = {
      ...(baseCriterion.fallback_rule || {}),
      ...(override.fallback_rule || {})
    };
  }

  return merged;
}

function expandCriteriaWithCommon(rubric) {
  const commonEntries = Array.isArray(rubric?.common_criteria) ? rubric.common_criteria : [];
  const expandedCommon = commonEntries
    .map((entry) => {
      if (!entry) return null;
      const id = typeof entry === "string" ? entry : entry.id;
      const base = COMMON_CRITERIA[id];
      if (!base) return null;

      if (typeof entry === "string") {
        return deepClone(base);
      }

      return mergeCriterionWithOverride(deepClone(base), entry);
    })
    .filter(Boolean);

  const caseSpecific = Array.isArray(rubric?.criteria) ? rubric.criteria : [];

  return [...expandedCommon, ...caseSpecific];
}

module.exports = {
  COMMON_CRITERIA,
  expandCriteriaWithCommon
};
