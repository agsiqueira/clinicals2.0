const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildDebriefChatSystemPrompt,
  normalizeDebriefChatMessages,
} = require("../src/utils/debriefChat");
const conversationsRouter = require("../src/routes/conversations");

test("buildDebriefChatSystemPrompt uses completed session context and avoids regrading", () => {
  const prompt = buildDebriefChatSystemPrompt({
    debrief: {
      sessionScore: 67,
      badgeTier: "SILVER",
      achievementResults: [
        {
          title: "Formal Introduction",
          percentScore: 33,
          feedback: "Review: stated role",
        },
      ],
    },
  });

  assert.match(prompt, /Session score: 67%/);
  assert.match(prompt, /Badge tier: SILVER/);
  assert.match(prompt, /Formal Introduction: 33%/);
  assert.match(prompt, /Do not re-grade/);
  assert.match(prompt, /50-60 words maximum/);
  assert.match(prompt, /only the completed session report context/);
});

test("normalizeDebriefChatMessages keeps only recent user and assistant messages", () => {
  const messages = normalizeDebriefChatMessages([
    { role: "system", content: "ignore" },
    { role: "user", content: "one" },
    { role: "assistant", content: "two" },
    { role: "other", content: "ignore" },
    { role: "user", content: "" },
  ]);

  assert.deepEqual(messages, [
    { role: "user", content: "one" },
    { role: "assistant", content: "two" },
  ]);
});

test("conversations router registers debrief chat before generic conversation lookup", () => {
  const routes = conversationsRouter.stack
    .filter((layer) => layer.route)
    .map((layer) => ({
      path: layer.route.path,
      methods: layer.route.methods,
    }));

  const debriefChatIndex = routes.findIndex(
    (route) => route.path === "/:id/debrief-chat" && route.methods.post
  );
  const conversationLookupIndex = routes.findIndex(
    (route) => route.path === "/:id" && route.methods.get
  );

  assert.notEqual(debriefChatIndex, -1);
  assert.notEqual(conversationLookupIndex, -1);
  assert.ok(debriefChatIndex < conversationLookupIndex);
});
