const fs = require("fs/promises");
const path = require("path");

const CASES_DIR = path.resolve(__dirname, "../../../cases");

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function listCases() {
  const entries = await fs.readdir(CASES_DIR);
  const caseFiles = entries.filter((name) => name.endsWith(".json") && !name.endsWith("_grading.json"));

  const cases = await Promise.all(
    caseFiles.map(async (fileName) => {
      const filePath = path.join(CASES_DIR, fileName);
      const caseData = await readJson(filePath);
      return {
        caseId: caseData.case_id || fileName.replace(".json", ""),
        title: caseData.display_title || fileName.replace(".json", ""),
        level: Number(caseData.level) || 1
      };
    })
  );

  return cases.sort((a, b) => a.caseId.localeCompare(b.caseId));
}

async function loadCase(caseId) {
  const filePath = path.join(CASES_DIR, `${caseId}.json`);
  try {
    return await readJson(filePath);
  } catch (err) {
    if (err.code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

async function loadGrading(caseId) {
  const filePath = path.join(CASES_DIR, `${caseId}_grading.json`);
  try {
    return await readJson(filePath);
  } catch (err) {
    if (err.code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

module.exports = {
  listCases,
  loadCase,
  loadGrading
};
