const nodemailer = require("nodemailer");

function formatList(items) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return items.map((i) => `• ${i}`).join("\n");
}

function buildResultsEmailContent({ userName, caseId, result, conversation }) {
  const passed = result.passed ? "✅ Passed" : "❌ Not Passed";

  const sections = (result.section_scores || [])
    .map((s) => `• ${s.label || s.section}: ${s.earned_points}/${s.available_points}`)
    .join("\n");

  const redFlags = formatList(result.missed_red_flags);
  const missedItems = formatList(result.missed_required_questions);
  const criticalFails = formatList(result.critical_fails_triggered);
  const transcript = Array.isArray(conversation) && conversation.length > 0
    ? conversation
        .map((msg) => `[${msg.role.toUpperCase()}]: ${msg.content}`)
        .join("\n")
    : null;

  const text = [
    `Hi ${userName || "Student"},`,
    ``,
    `Here are your results for case: ${caseId}`,
    ``,
    `Score: ${result.score}% (passing threshold: ${result.passing_score}%)`,
    `Result: ${passed}`,
    `Points: ${result.earned_points ?? "N/A"} / ${result.available_points ?? "N/A"}`,
    ``,
    `Section Scores:`,
    sections || "N/A",
    criticalFails ? `\nCritical Fails:\n${criticalFails}` : null,
    redFlags ? `\nMissed Red Flags:\n${redFlags}` : null,
    missedItems ? `\nMissed History Items:\n${missedItems}` : null,
    ``,
    `Feedback:`,
    result.feedback || "No feedback provided.",
    ``,
    transcript ? `\nConversation Transcript:\n${transcript}` : null,
    `— Clinicals`,
  ]
    .filter((line) => line !== null)
    .join("\n");

  return {
    subject: `Clinicals Result — ${caseId} — ${result.score}% ${passed}`,
    text,
  };
}

async function sendResultsEmail({ toEmail, userName, caseId, result, conversation }) {
  if (!process.env.EMAIL_USER) return;

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT || 587),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const { subject, text } = buildResultsEmailContent({
    userName,
    caseId,
    result,
    conversation,
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: toEmail,
    subject,
    text,
  });
}

module.exports = { sendResultsEmail, buildResultsEmailContent };
