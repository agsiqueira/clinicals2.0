const express = require("express");
const { listCases, loadCase } = require("../utils/caseLoader");
const { sanitizeCase } = require("../utils/safeCase");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const router = express.Router();

router.get("/", async (_req, res, next) => {
  try {
    const cases = await listCases();
    res.json(cases);
  } catch (err) {
    next(err);
  }
});

router.get("/:caseId", async (req, res, next) => {
  try {
    const caseId = req.params.caseId;

    // Generate patient img once if doesn't exist
    const imagePath = path.resolve(
      __dirname,
      `../../../mobile/assets/patients/${caseId}.png`
    );

    if (!fs.existsSync(imagePath)) {
      const scriptPath = path.resolve(__dirname, "../../scripts/generatePatientImage.js");
      const backendRoot = path.resolve(__dirname, "../..");

      await new Promise((resolve, reject) => {
        execFile("node", [scriptPath, caseId], { cwd: backendRoot }, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    }
    
    const caseData = await loadCase(req.params.caseId);
    if (!caseData) {
      res.status(404).json({ error: "Case not found" });
      return;
    }
    res.json(sanitizeCase(caseData));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
