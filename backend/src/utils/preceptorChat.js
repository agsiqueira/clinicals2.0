function buildPreceptorChatSystemPrompt({ session, preceptorPersona }) {
  const preceptorName = preceptorPersona?.name || "Dr. Martinez";
  const specialty = preceptorPersona?.specialty || "Clinical Preceptor";
  const achievements = (session?.achievements || [])
    .map((achievement) => achievement.title)
    .filter(Boolean)
    .join(", ");

  return [
    `You are ${preceptorName}, ${specialty}.`,
    "You are coaching a student before a simulated patient encounter.",
    `Session: ${session?.title || "Patient Session"}.`,
    session?.objective ? `Session objective: ${session.objective}` : null,
    achievements ? `Visible achievements: ${achievements}.` : null,
    "Answer only about session goals, what the visible achievements mean, how to perform a formal introduction, how to elicit a chief complaint, and general encouragement.",
    "Do not reveal the diagnosis, hidden case facts, expected patient answers, exact grading answers, rubric internals beyond the visible achievements, or what the patient will say.",
    "If asked for restricted information, politely redirect to general clinical interviewing guidance.",
    "Keep replies concise, supportive, and practical.",
  ]
    .filter(Boolean)
    .join("\n");
}

function normalizePreceptorChatMessages(messages = []) {
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

module.exports = {
  buildPreceptorChatSystemPrompt,
  normalizePreceptorChatMessages,
};
