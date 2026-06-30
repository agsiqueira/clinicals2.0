const BROAD_QUESTION_PATTERN =
  /\b(tell me more|what else|anything else|can you explain|say more|more about|elaborate)\b/i;

const SENSITIVE_TOPICS = new Set([
  "blood_in_urine",
  "fever",
  "chills",
  "flank_pain",
  "nausea",
  "vomiting",
  "abdominal_pain",
  "back_pain",
  "vaginal_discharge",
  "vaginal_bleeding",
  "genital_rash",
  "discharge",
  "rectal_bleeding",
  "rectal_discharge",
  "allergies",
  "medications",
  "past_medical_history",
  "social_history",
  "family_history",
  "pregnancy",
  "sexual_history",
]);

const TOPIC_ALIASES = {
  chief_complaint: ["what brings", "why are you here", "how can i help", "main concern", "chief complaint", "problem"],
  onset: ["when did", "when started", "start", "started", "begin", "began", "onset", "how long ago"],
  location: ["where", "location", "located", "area"],
  duration: ["how long", "duration", "last", "lasting", "constant"],
  character: ["feel like", "describe", "kind of", "quality", "character", "burning", "itchy", "sneezing"],
  severity: ["how bad", "severity", "scale", "rate", "painful", "pain level", "0 to 10", "1 to 10"],
  timing: ["when does", "timing", "how often", "frequency", "time of day"],
  radiation: ["radiate", "radiates", "spread", "travels"],
  aggravating_factors: ["worse", "trigger", "triggers", "aggravate", "aggravating", "bring it on"],
  relieving_factors: ["better", "relief", "relieve", "helps", "improve", "improves"],
  modifying_factors: ["tried", "taken", "take anything", "treatment", "medicine", "medication for this"],
  urinary_frequency: ["frequency", "frequent", "pee often", "urinate often"],
  urgency: ["urgency", "urgent", "rush"],
  blood_in_urine: ["blood", "bloody", "hematuria", "red urine", "pink urine"],
  fever: ["fever", "temperature"],
  chills: ["chills"],
  flank_pain: ["flank", "side pain", "back pain"],
  abdominal_pain: ["abdominal pain", "belly pain", "stomach pain", "abdomen"],
  back_pain: ["back pain"],
  nausea: ["nausea", "nauseous"],
  vomiting: ["vomit", "vomiting", "throwing up"],
  vaginal_discharge: ["vaginal discharge", "discharge"],
  vaginal_bleeding: ["vaginal bleeding"],
  genital_rash: ["genital rash", "rash"],
  discharge: ["discharge"],
  rectal_bleeding: ["rectal bleeding"],
  rectal_discharge: ["rectal discharge"],
  cough: ["cough"],
  wheezing: ["wheezing", "wheeze"],
  shortness_of_breath: ["shortness of breath", "trouble breathing", "breath"],
  chest_pain: ["chest pain", "chest"],
  facial_pain: ["facial pain", "face pain", "sinus pain"],
  sick_contacts: ["sick contacts", "around anyone sick"],
  allergies: ["allergy", "allergies", "allergic"],
  medications: ["medication", "medications", "medicine", "meds", "take anything"],
  past_medical_history: ["medical history", "health problems", "conditions", "illnesses", "hospitalizations", "surgeries"],
  family_history: ["family history", "parents", "siblings", "mother", "father"],
  social_history: ["smoke", "smoking", "tobacco", "alcohol", "drugs", "job", "work", "school", "living"],
  pregnancy: ["pregnant", "pregnancy", "period", "lmp", "last menstrual", "missed period"],
  sexual_history: ["sex", "sexual", "partner", "condom", "birth control"],
};

const BROAD_TOPIC_ORDER = [
  "chief_complaint",
  "onset",
  "location",
  "duration",
  "character",
  "severity",
  "timing",
  "aggravating_factors",
  "relieving_factors",
  "modifying_factors",
  "radiation",
];

function normalizeText(value) {
  return String(value || "").toLowerCase();
}

function humanizeKey(key) {
  return String(key || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function addFact(facts, fact) {
  if (!fact || !fact.id || fact.text == null) return;
  const category = fact.category || "case_fact";
  const sensitive = fact.sensitive ?? SENSITIVE_TOPICS.has(fact.topic);
  const text = sanitizeFactText(String(fact.text).trim(), { category, sensitive });
  if (!text) return;
  facts.push({
    aliases: TOPIC_ALIASES[fact.topic] || [fact.topic],
    broadEligible: !SENSITIVE_TOPICS.has(fact.topic) && BROAD_TOPIC_ORDER.includes(fact.topic),
    category,
    sensitive,
    ...fact,
    text,
  });
}

function sanitizeFactText(text, { category, sensitive }) {
  if (!text || category === "pertinent_negative" || sensitive) return text;
  return text
    .replace(/\s*;\s*(no|denies|without)\b[^.;]*/gi, "")
    .replace(/\bonly\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function topicFromPertinentNegative(value) {
  const text = normalizeText(value);
  if (text.includes("fever")) return "fever";
  if (text.includes("chill")) return "chills";
  if (text.includes("flank")) return "flank_pain";
  if (text.includes("abdominal")) return "abdominal_pain";
  if (text.includes("back pain")) return "back_pain";
  if (text.includes("nausea")) return "nausea";
  if (text.includes("vomit")) return "vomiting";
  if (text.includes("vaginal discharge")) return "vaginal_discharge";
  if (text.includes("vaginal bleeding")) return "vaginal_bleeding";
  if (text.includes("genital rash")) return "genital_rash";
  if (text.includes("discharge")) return "discharge";
  if (text.includes("rectal bleeding")) return "rectal_bleeding";
  if (text.includes("rectal discharge")) return "rectal_discharge";
  if (text.includes("shortness of breath")) return "shortness_of_breath";
  if (text.includes("wheez")) return "wheezing";
  if (text.includes("chest pain")) return "chest_pain";
  if (text.includes("facial pain")) return "facial_pain";
  if (text.includes("sick contact")) return "sick_contacts";
  if (text.includes("back pain")) return "flank_pain";
  return null;
}

function topicFromSymptom(key) {
  if (key === "hematuria") return "blood_in_urine";
  if (key === "urinary_frequency") return "urinary_frequency";
  return key;
}

function symptomText(key, value, caseData) {
  const topic = topicFromSymptom(key);
  if (topic === "blood_in_urine" && value) {
    return caseData?.history?.urine_description?.blood_observed || "There has been some blood in my urine.";
  }
  return value ? `Yes, I have ${humanizeKey(key).toLowerCase()}.` : `No, I do not have ${humanizeKey(key).toLowerCase()}.`;
}

function extractFacts(caseData) {
  const facts = [];
  const history = caseData?.history || {};

  addFact(facts, {
    id: "presenting_info.chief_complaint",
    topic: "chief_complaint",
    text: caseData?.presenting_info?.opening_statement || caseData?.presenting_info?.chief_complaint,
    order: 0,
  });

  Object.entries(history.old_carts || {}).forEach(([key, value], index) => {
    const topic = key === "what_tried" ? "modifying_factors" : key;
    addFact(facts, {
      id: `history.old_carts.${key}`,
      topic,
      text: value,
      order: 10 + index,
    });
  });

  Object.entries(history.symptoms || {}).forEach(([key, value], index) => {
    const topic = topicFromSymptom(key);
    addFact(facts, {
      id: `history.symptoms.${key}`,
      topic,
      text: symptomText(key, value, caseData),
      order: 40 + index,
    });
  });

  (history.pertinent_negatives || []).forEach((value, index) => {
    const topic = topicFromPertinentNegative(value);
    if (!topic) return;
    addFact(facts, {
      id: `history.pertinent_negatives.${index}`,
      category: "pertinent_negative",
      topic,
      text: value,
      order: 70 + index,
    });
  });

  Object.entries(history.urine_description || {}).forEach(([key, value], index) => {
    addFact(facts, {
      id: `history.urine_description.${key}`,
      topic: key === "blood_observed" ? "blood_in_urine" : key,
      text: value,
      order: 90 + index,
    });
  });

  (history.allergies || []).forEach((value, index) => {
    addFact(facts, {
      id: `history.allergies.${index}`,
      topic: "allergies",
      text: value,
      order: 110 + index,
    });
  });

  (history.medications || []).forEach((value, index) => {
    const text =
      typeof value === "string"
        ? value
        : [value?.name, value?.effect].filter(Boolean).join(": ");
    addFact(facts, {
      id: `history.medications.${index}`,
      topic: "medications",
      text,
      order: 120 + index,
    });
  });

  Object.entries(history.past_medical_history || {}).forEach(([key, value], index) => {
    addFact(facts, {
      id: `history.past_medical_history.${key}`,
      topic: "past_medical_history",
      text: Array.isArray(value) ? value.join("; ") : value,
      order: 130 + index,
    });
  });

  Object.entries(history.family_history || {}).forEach(([key, value], index) => {
    addFact(facts, {
      id: `history.family_history.${key}`,
      topic: "family_history",
      text: value,
      order: 150 + index,
    });
  });

  Object.entries(caseData?.social_history || {}).forEach(([key, value], index) => {
    addFact(facts, {
      id: `social_history.${key}`,
      topic: "social_history",
      text: typeof value === "object" ? JSON.stringify(value) : value,
      order: 170 + index,
    });
  });

  Object.entries(history.contextual_factors || {}).forEach(([key, value], index) => {
    addFact(facts, {
      id: `history.contextual_factors.${key}`,
      topic: key.includes("exposure") ? "aggravating_factors" : "timing",
      text: value,
      order: 190 + index,
    });
  });

  Object.entries(history.pregnancy || {}).forEach(([key, value], index) => {
    addFact(facts, {
      id: `history.pregnancy.${key}`,
      topic: "pregnancy",
      text: `${humanizeKey(key)}: ${value}`,
      order: 210 + index,
    });
  });

  Object.entries(history.sexual_history || {}).forEach(([key, value], index) => {
    addFact(facts, {
      id: `history.sexual_history.${key}`,
      topic: "sexual_history",
      text: `${humanizeKey(key)}: ${value}`,
      order: 230 + index,
    });
  });

  return facts.sort((a, b) => (a.order || 0) - (b.order || 0));
}

function matchesAlias(text, alias) {
  const normalizedAlias = normalizeText(alias);
  if (!normalizedAlias) return false;
  if (normalizedAlias.includes(" ")) return text.includes(normalizedAlias);
  return new RegExp(`\\b${normalizedAlias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text);
}

function classifyQuestion(text, facts = []) {
  const normalized = normalizeText(text);
  const isBroad = BROAD_QUESTION_PATTERN.test(normalized);
  const topics = new Set();

  for (const fact of facts) {
    const aliases = fact.aliases || TOPIC_ALIASES[fact.topic] || [];
    if (aliases.some((alias) => matchesAlias(normalized, alias))) {
      topics.add(fact.topic);
    }
  }

  return {
    isBroad,
    topics: Array.from(topics),
  };
}

function selectAllowedFacts({ facts, question, disclosedFactIds = new Set() }) {
  const classification = classifyQuestion(question, facts);

  if (classification.topics.length > 0) {
    const matchingFacts = facts.filter(
      (fact) => classification.topics.includes(fact.topic) && !disclosedFactIds.has(fact.id)
    );
    return classification.isBroad ? matchingFacts.slice(0, 1) : matchingFacts;
  }

  if (classification.isBroad) {
    const nextFact = facts.find(
      (fact) => fact.broadEligible && !fact.sensitive && !disclosedFactIds.has(fact.id)
    );
    return nextFact ? [nextFact] : [];
  }

  return [];
}

function userMessages(messages = []) {
  return messages
    .filter((message) => message?.role === "user" && String(message.content || "").trim())
    .map((message) => String(message.content || "").trim());
}

function normalizeDisclosedFactIds(value) {
  if (!Array.isArray(value)) return null;
  return Array.from(
    new Set(
      value
        .map((id) => String(id || "").trim())
        .filter(Boolean)
    )
  );
}

function inferDisclosedFactIds({ facts, messages }) {
  const ids = new Set();
  const turns = userMessages(messages);
  const priorTurns = turns.slice(0, -1);

  for (const question of priorTurns) {
    const selected = selectAllowedFacts({ facts, question, disclosedFactIds: ids });
    selected.forEach((fact) => ids.add(fact.id));
  }

  return ids;
}

function buildDisclosureState({ caseData, messages = [], disclosedFactIds }) {
  const facts = extractFacts(caseData);
  const persistedIds = normalizeDisclosedFactIds(disclosedFactIds);
  const startingFactIds = persistedIds
    ? new Set(persistedIds)
    : inferDisclosedFactIds({ facts, messages });
  const turns = userMessages(messages);
  const latestQuestion = turns[turns.length - 1] || "";
  const latestClassification = classifyQuestion(latestQuestion, facts);
  const allowedFacts = latestQuestion
    ? selectAllowedFacts({ facts, question: latestQuestion, disclosedFactIds: startingFactIds })
    : [];
  const allowedFactIds = new Set(allowedFacts.map((fact) => fact.id));
  const hideForBroadQuestion = (fact) =>
    latestClassification.isBroad &&
    (fact.category === "pertinent_negative" || fact.sensitive) &&
    !latestClassification.topics.includes(fact.topic);
  const alreadyDisclosedFacts = facts.filter(
    (fact) =>
      startingFactIds.has(fact.id) &&
      !allowedFactIds.has(fact.id) &&
      !hideForBroadQuestion(fact)
  );
  const patientProfile = caseData?.patient_profile || {};
  const nextDisclosedFactIds = Array.from(
    new Set([...Array.from(startingFactIds), ...Array.from(allowedFactIds)])
  );

  const visibleCase = {
    case_id: caseData?.case_id,
    display_title: caseData?.display_title,
    setting: caseData?.setting,
    frame: caseData?.frame,
    patient_profile: {
      first_name: patientProfile.first_name,
      last_name: patientProfile.last_name,
      preferred_name: patientProfile.preferred_name,
      communication_style: patientProfile.communication_style,
    },
    visible_facts: {
      already_disclosed: alreadyDisclosedFacts.map(publicFact),
      allowed_this_turn: allowedFacts.map(publicFact),
    },
  };

  return {
    visibleCase,
    allowedFactIds: Array.from(allowedFactIds),
    nextDisclosedFactIds,
  };
}

function buildVisibleCase({ caseData, messages = [], disclosedFactIds }) {
  return buildDisclosureState({ caseData, messages, disclosedFactIds }).visibleCase;
}

function publicFact(fact) {
  return {
    id: fact.id,
    topic: fact.topic,
    text: fact.text,
  };
}

module.exports = {
  buildDisclosureState,
  buildVisibleCase,
  classifyQuestion,
  extractFacts,
  inferDisclosedFactIds,
  normalizeDisclosedFactIds,
  selectAllowedFacts,
};
