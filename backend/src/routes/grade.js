const express = require("express");
const { loadCase, loadGrading } = require("../utils/caseLoader");
const { gradeConversation } = require("../utils/grading");

const router = express.Router();

router.post("/", async (req, res, next) => {
  try {
    const { caseId, conversation, hpi } = req.body || {};
    if (!caseId || !Array.isArray(conversation)) {
      res.status(400).json({ error: "caseId and conversation are required" });
      return;
    }
    if (hpi != null && typeof hpi !== "string") {
      res.status(400).json({ error: "hpi must be a string when provided" });
      return;
    }

    const [caseData, gradingData] = await Promise.all([
      loadCase(caseId),
      loadGrading(caseId)
    ]);

    if (!caseData || !gradingData) {
      res.status(404).json({ error: "Case or grading rubric not found" });
      return;
    }

    const result = await gradeConversation({
      caseData,
      gradingData,
      conversation,
      supplementalInputs: {
        hpi: String(hpi || "").trim()
      }
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
