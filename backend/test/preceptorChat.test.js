const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildPreceptorChatSystemPrompt,
  normalizePreceptorChatMessages,
} = require("../src/utils/preceptorChat");
const learningPathsRouter = require("../src/routes/learningPaths");

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
  assert.match(prompt, /Answer only the student's question/);
  assert.match(prompt, /50-60 words maximum/);
  assert.match(prompt, /Avoid long explanations, lists, and multi-paragraph responses/);
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

test("learning paths router registers preceptor chat before session overview", () => {
  const routes = learningPathsRouter.stack
    .filter((layer) => layer.route)
    .map((layer) => ({
      path: layer.route.path,
      methods: layer.route.methods,
    }));

  const preceptorChatIndex = routes.findIndex(
    (route) => route.path === "/patient-sessions/:slug/preceptor-chat" && route.methods.post
  );
  const overviewIndex = routes.findIndex(
    (route) => route.path === "/patient-sessions/:slug" && route.methods.get
  );

  assert.notEqual(preceptorChatIndex, -1);
  assert.notEqual(overviewIndex, -1);
  assert.ok(preceptorChatIndex < overviewIndex);
});
