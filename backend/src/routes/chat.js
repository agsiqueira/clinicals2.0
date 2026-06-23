const express = require("express");
const { loadCase } = require("../utils/caseLoader");
const { sanitizeCase } = require("../utils/safeCase");
const { buildPatientSystemPrompt } = require("../utils/patientPrompt");
const { createPatientReply } = require("../llm/navigatorClient");

const router = express.Router();

// prevent transcript aka data dump
function cleanPatientReply(raw) {
  return String(raw || "")
    .split(/\n\s*(user|assistant)\b[:]?/i)[0]
    .trim();
}

router.post("/", async (req, res, next) => {
  try {
    const { caseId, messages } = req.body || {};
    if (!caseId || !Array.isArray(messages)) {
      res.status(400).json({ error: "caseId and messages are required" });
      return;
    }

    const caseData = await loadCase(caseId);
    if (!caseData) {
      res.status(404).json({ error: "Case not found" });
      return;
    }

    const safeCase = sanitizeCase(caseData);
    const osceOpening = caseData.osce_opening || null;
    // Keep opening metadata available to the client, but avoid feeding scripted
    // opening text to the patient model to reduce canned responses.
    const { osce_opening, ...promptCase } = safeCase;

    const sanitizedMessages = messages
      .filter((m) => m && (m.role === "user" || m.role === "assistant"))
      .map((m) => ({
        role: m.role,
        content: String(m.content || "")
      }))
      .filter((m) => m.content.trim().length > 0);

    // allow client to fetch case opener metadata WITHOUT starting the chat
    if (sanitizedMessages.length === 0) {
      res.json({ reply: "", osce_opening: osceOpening });
      return;
    }

    // Use the LLM for all turns so responses are not hardcoded by turn number.
    const systemPrompt = buildPatientSystemPrompt(promptCase);

    const replyRaw = await createPatientReply({
      systemPrompt,
      messages: sanitizedMessages
    });

    const reply = cleanPatientReply(replyRaw);

    res.json({ reply, osce_opening: osceOpening });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
