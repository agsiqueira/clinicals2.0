const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildPreceptorChatSystemPrompt,
  normalizePreceptorChatMessages,
} = require("../src/utils/preceptorChat");

test("buildPreceptorChatSystemPrompt scopes Dr. Martinez to visible coaching topics", () => {
  const prompt = buildPreceptorChatSystemPrompt({
    preceptorPersona: {
      name: "Dr. Martinez",
      specialty: "Clinical Preceptor",
    },
    session: {
      title: "First Patient",
      objective: "Meet your first patient and begin the clinical encounter.",
      achievements: [{ title: "Formal Introduction" }, { title: "Chief Complaint" }],
    },
  });

  assert.match(prompt, /Dr\. Martinez/);
  assert.match(prompt, /Formal Introduction/);
  assert.match(prompt, /Chief Complaint/);
  assert.match(prompt, /Do not reveal the diagnosis/);
  assert.match(prompt, /hidden case facts/);
  assert.match(prompt, /expected patient answers/);
});

test("normalizePreceptorChatMessages keeps only recent user and assistant content", () => {
  const messages = normalizePreceptorChatMessages([
    { role: "system", content: "ignore" },
    { role: "user", content: "one" },
    { role: "assistant", content: "two" },
    { role: "user", content: "" },
    { role: "other", content: "ignore" },
  ]);

  assert.deepEqual(messages, [
    { role: "user", content: "one" },
    { role: "assistant", content: "two" },
  ]);
});
