const express = require("express");
const prisma = require("../db/prisma");
const { loadCase } = require("../utils/caseLoader");
const { sanitizeCase } = require("../utils/safeCase");
const { buildPatientSystemPrompt } = require("../utils/patientPrompt");
const { buildDisclosureState } = require("../utils/patientDisclosure");
const { createPatientReply } = require("../llm/navigatorClient");

const router = express.Router();

// prevent transcript aka data dump
function cleanPatientReply(raw) {
  return String(raw || "")
    .split(/\n\s*(user|assistant)\b[:]?/i)[0]
    .trim();
}

function getClerkUserId(req) {
  return req.header("x-clerk-user-id");
}

async function loadConversationForDisclosure({ req, conversationId, caseId }) {
  if (!conversationId) return null;

  const conversation = await prisma.conversation.findUnique({
    where: { id: String(conversationId) },
    include: {
      patientCase: true,
      user: true,
    },
  });

  if (!conversation) {
    const error = new Error("Conversation not found");
    error.status = 404;
    throw error;
  }

  if (conversation.patientCase.caseId !== caseId) {
    const error = new Error("conversationId does not match caseId");
    error.status = 400;
    throw error;
  }

  const clerkUserId = getClerkUserId(req);
  if (clerkUserId && conversation.user.clerkUserId !== clerkUserId) {
    const error = new Error("Forbidden");
    error.status = 403;
    throw error;
  }

  return conversation;
}

router.post("/", async (req, res, next) => {
  try {
    const { caseId, conversationId, messages } = req.body || {};
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

    const conversation = await loadConversationForDisclosure({
      req,
      conversationId,
      caseId,
    });

    // Use the LLM for all turns so responses are not hardcoded by turn number.
    const disclosureState = buildDisclosureState({
      caseData: promptCase,
      messages: sanitizedMessages,
      disclosedFactIds: conversation?.disclosedFactIds,
    });
    const { visibleCase, nextDisclosedFactIds } = disclosureState;
    const systemPrompt = buildPatientSystemPrompt(visibleCase);

    const replyRaw = await createPatientReply({
      systemPrompt,
      messages: sanitizedMessages
    });

    const reply = cleanPatientReply(replyRaw);

    if (conversation) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { disclosedFactIds: nextDisclosedFactIds },
      });
    }

    res.json({ reply, osce_opening: osceOpening });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
