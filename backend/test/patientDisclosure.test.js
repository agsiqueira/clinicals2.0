const test = require("node:test");
const assert = require("node:assert/strict");

const { loadCase } = require("../src/utils/caseLoader");
const {
  buildDisclosureState,
  buildVisibleCase,
  extractFacts,
  selectAllowedFacts,
} = require("../src/utils/patientDisclosure");

test("broad questions reveal only one non-sensitive clinical fact", async () => {
  const caseData = await loadCase("uti_level1");
  const visibleCase = buildVisibleCase({
    caseData,
    messages: [{ role: "user", content: "Tell me more." }],
  });

  assert.equal(visibleCase.visible_facts.allowed_this_turn.length, 1);
  assert.equal(visibleCase.visible_facts.allowed_this_turn[0].topic, "chief_complaint");
  assert.ok(
    !visibleCase.visible_facts.allowed_this_turn.some((fact) =>
      /blood|fever|flank|nausea|vomit|discharge|allerg|medication|medical history/i.test(
        fact.text
      )
    )
  );
});

test("transcript replay advances broad disclosure to the next undisclosed fact", async () => {
  const caseData = await loadCase("uti_level1");
  const visibleCase = buildVisibleCase({
    caseData,
    messages: [
      { role: "user", content: "Tell me more." },
      { role: "assistant", content: "I have burning when I urinate." },
      { role: "user", content: "What else is going on?" },
    ],
  });

  assert.deepEqual(
    visibleCase.visible_facts.already_disclosed.map((fact) => fact.topic),
    ["chief_complaint"]
  );
  assert.equal(visibleCase.visible_facts.allowed_this_turn.length, 1);
  assert.equal(visibleCase.visible_facts.allowed_this_turn[0].topic, "onset");
});

test("broad questions do not expose negatives or red flags alongside the one allowed fact", async () => {
  const caseData = await loadCase("uti_level1");
  const state = buildDisclosureState({
    caseData,
    disclosedFactIds: [
      "presenting_info.chief_complaint",
      "history.old_carts.onset",
      "history.pertinent_negatives.8",
    ],
    messages: [{ role: "user", content: "Tell me more." }],
  });
  const visibleFactsText = JSON.stringify(state.visibleCase.visible_facts);

  assert.equal(state.visibleCase.visible_facts.allowed_this_turn.length, 1);
  assert.deepEqual(state.allowedFactIds, ["history.old_carts.location"]);
  assert.match(
    state.visibleCase.visible_facts.allowed_this_turn[0].text,
    /genital area/i
  );
  assert.doesNotMatch(
    visibleFactsText,
    /abdominal pain|fever|blood|flank|nausea|vomit|discharge|allerg|medication|medical history/i
  );
});

test("specific questions reveal only matching facts", async () => {
  const caseData = await loadCase("uti_level1");
  const facts = extractFacts(caseData);
  const selected = selectAllowedFacts({
    facts,
    question: "When did it start?",
    disclosedFactIds: new Set(),
  });

  assert.deepEqual(selected.map((fact) => fact.topic), ["onset"]);
});

test("compound specific questions reveal each specifically requested fact", async () => {
  const caseData = await loadCase("uti_level1");
  const facts = extractFacts(caseData);
  const selected = selectAllowedFacts({
    facts,
    question: "When did it start and how bad is it?",
    disclosedFactIds: new Set(),
  });

  assert.deepEqual(selected.map((fact) => fact.topic), ["onset", "severity"]);
});

test("sensitive facts are available only when directly asked", async () => {
  const caseData = await loadCase("uti_level1");
  const broadVisibleCase = buildVisibleCase({
    caseData,
    messages: [{ role: "user", content: "What else?" }],
  });
  const directVisibleCase = buildVisibleCase({
    caseData,
    messages: [{ role: "user", content: "Have you noticed any blood in your urine?" }],
  });

  assert.ok(
    !broadVisibleCase.visible_facts.allowed_this_turn.some(
      (fact) => fact.topic === "blood_in_urine"
    )
  );
  assert.ok(
    directVisibleCase.visible_facts.allowed_this_turn.some(
      (fact) => fact.topic === "blood_in_urine"
    )
  );
});

test("persisted disclosed fact IDs advance broad disclosure without transcript replay", async () => {
  const caseData = await loadCase("uti_level1");
  const state = buildDisclosureState({
    caseData,
    disclosedFactIds: ["presenting_info.chief_complaint"],
    messages: [{ role: "user", content: "Tell me more." }],
  });

  assert.deepEqual(state.allowedFactIds, ["history.old_carts.onset"]);
  assert.deepEqual(state.nextDisclosedFactIds, [
    "presenting_info.chief_complaint",
    "history.old_carts.onset",
  ]);
  assert.deepEqual(
    state.visibleCase.visible_facts.already_disclosed.map((fact) => fact.id),
    ["presenting_info.chief_complaint"]
  );
  assert.deepEqual(
    state.visibleCase.visible_facts.allowed_this_turn.map((fact) => fact.id),
    ["history.old_carts.onset"]
  );
});

test("persisted disclosed fact IDs are the source of truth when provided", async () => {
  const caseData = await loadCase("uti_level1");
  const state = buildDisclosureState({
    caseData,
    disclosedFactIds: [],
    messages: [
      { role: "user", content: "Tell me more." },
      { role: "assistant", content: "I have burning when I urinate." },
      { role: "user", content: "What else?" },
    ],
  });

  assert.deepEqual(state.allowedFactIds, ["presenting_info.chief_complaint"]);
  assert.deepEqual(state.nextDisclosedFactIds, ["presenting_info.chief_complaint"]);
});
