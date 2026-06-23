const test = require("node:test");
const assert = require("node:assert/strict");

const { buildResultsEmailContent } = require("../src/utils/emailResults");

test("buildResultsEmailContent includes results summary and transcript lines", () => {
  const { subject, text } = buildResultsEmailContent({
    userName: "Josephine",
    caseId: "uti_level1",
    result: {
      score: 91,
      passing_score: 84,
      passed: true,
      earned_points: 42,
      available_points: 46,
      feedback: "Strong interview.",
      section_scores: [
        { section: "reporter", label: "Reporter", earned_points: 30, available_points: 37 },
      ],
      missed_red_flags: ["Assesses pregnancy status"],
      missed_required_questions: ["Assesses medications"],
      critical_fails_triggered: [],
    },
    conversation: [
      { role: "user", content: "What brings you in today?" },
      { role: "assistant", content: "Burning when I urinate." },
    ],
  });

  assert.equal(subject, "Clinicals Result — uti_level1 — 91% ✅ Passed");
  assert.match(text, /Hi Josephine,/);
  assert.match(text, /Score: 91% \(passing threshold: 84%\)/);
  assert.match(text, /Section Scores:/);
  assert.match(text, /• Reporter: 30\/37/);
  assert.match(text, /Missed Red Flags:/);
  assert.match(text, /Assesses pregnancy status/);
  assert.match(text, /Conversation Transcript:/);
  assert.match(text, /\[USER\]: What brings you in today\?/);
  assert.match(text, /\[ASSISTANT\]: Burning when I urinate\./);
});

test("buildResultsEmailContent omits empty optional sections cleanly", () => {
  const { text } = buildResultsEmailContent({
    userName: "",
    caseId: "uti_level1",
    result: {
      score: 40,
      passing_score: 84,
      passed: false,
      earned_points: 10,
      available_points: 46,
      feedback: "",
      section_scores: [],
      missed_red_flags: [],
      missed_required_questions: [],
      critical_fails_triggered: [],
    },
    conversation: [],
  });

  assert.match(text, /Hi Student,/);
  assert.doesNotMatch(text, /Conversation Transcript:/);
  assert.doesNotMatch(text, /Critical Fails:/);
  assert.doesNotMatch(text, /Missed Red Flags:/);
  assert.match(text, /Feedback:\nNo feedback provided\./);
});
