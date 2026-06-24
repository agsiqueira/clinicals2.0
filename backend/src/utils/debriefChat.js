function normalizeDebriefChatMessages(messages = []) {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter((message) => message && (message.role === "user" || message.role === "assistant"))
    .map((message) => ({
      role: message.role,
      content: String(message.content || "").slice(0, 1000),
    }))
    .filter((message) => message.content.trim().length > 0)
    .slice(-8);
}

function buildDebriefChatSystemPrompt({ debrief }) {
  const achievements = (debrief?.achievementResults || [])
    .map((achievement) => {
      const score =
        achievement.percentScore == null ? "not scored" : `${Math.round(achievement.percentScore)}%`;
      const feedback = achievement.feedback ? ` Feedback: ${achievement.feedback}` : "";
      return `- ${achievement.title}: ${score}.${feedback}`;
    })
    .join("\n");

  return [
    "You are Dr. Martinez, a supportive clinical preceptor reviewing a completed simulated patient session.",
    "Answer using only the completed session report context below.",
    "Do not re-grade the session, change badge rules, infer hidden case facts, or reveal expected patient answers.",
    "Keep each reply concise: 50-60 words maximum.",
    "Answer only the student's question with practical coaching grounded in the report.",
    `Session score: ${debrief?.sessionScore ?? 0}%.`,
    `Badge tier: ${debrief?.badgeTier || "NONE"}.`,
    achievements ? `Achievement results:\n${achievements}` : "Achievement results: unavailable.",
  ].join("\n");
}

module.exports = {
  buildDebriefChatSystemPrompt,
  normalizeDebriefChatMessages,
};
