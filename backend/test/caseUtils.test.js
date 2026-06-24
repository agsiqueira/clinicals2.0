const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const { listCases, loadCase, loadGrading } = require("../src/utils/caseLoader");
const casesRouter = require("../src/routes/cases");
const { sanitizeCase } = require("../src/utils/safeCase");
const { buildPatientSystemPrompt } = require("../src/utils/patientPrompt");
const { expandCriteriaWithCommon } = require("../src/utils/rubricCommon");

test("caseLoader lists and loads the active UTI case and rubric", async () => {
  const cases = await listCases();
  const caseData = await loadCase("uti_level1");
  const gradingData = await loadGrading("uti_level1");

  assert.ok(cases.some((entry) => entry.caseId === "uti_level1"));
  assert.equal(caseData.case_id, "uti_level1");
  assert.equal(gradingData.case_id, "uti_level1");
  assert.equal(gradingData.rubric.profile, "CPI1");
});

test("caseLoader lists and loads the Seasonal Allergies case and rubric", async () => {
  const cases = await listCases();
  const caseData = await loadCase("seasonal_allergies_level1");
  const gradingData = await loadGrading("seasonal_allergies_level1");

  assert.ok(cases.some((entry) => entry.caseId === "seasonal_allergies_level1"));
  assert.equal(caseData.case_id, "seasonal_allergies_level1");
  assert.equal(caseData.patient_profile.first_name, "Sarah");
  assert.equal(caseData.patient_profile.last_name, "Johnson");
  assert.equal(caseData.presenting_info.chief_complaint, "My seasonal allergies are getting worse.");
  assert.equal(gradingData.case_id, "seasonal_allergies_level1");
  assert.equal(gradingData.rubric.profile, "CPI1");
});

test("cases route returns Seasonal Allergies case even without generated patient image", async () => {
  const app = express();
  app.use("/api/cases", casesRouter);
  app.use((err, _req, res, _next) => {
    res.status(500).json({ error: err?.message || "Internal server error" });
  });

  const server = await new Promise((resolve) => {
    const nextServer = app.listen(0, "127.0.0.1", () => resolve(nextServer));
  });

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/cases/seasonal_allergies_level1`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.case_id, "seasonal_allergies_level1");
    assert.equal(body.patient_profile.first_name, "Sarah");
    assert.equal(body.presenting_info.chief_complaint, "My seasonal allergies are getting worse.");
    assert.ok(!("hidden_truth" in body));
  } finally {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
});

test("sanitizeCase removes hidden answer material before prompt building", async () => {
  const caseData = await loadCase("uti_level1");
  const safeCase = sanitizeCase(caseData);
  const prompt = buildPatientSystemPrompt(safeCase);

  assert.ok(!("hidden_truth" in safeCase));
  assert.equal(safeCase.presenting_info.chief_complaint, "Burning when urinating");
  assert.ok(prompt.includes("standardized patient"));
  assert.ok(prompt.includes("Taylor"));
  assert.ok(!prompt.includes("primary_diagnosis"));
});

test("expandCriteriaWithCommon merges reusable rubric criteria and case-specific overrides", async () => {
  const gradingData = await loadGrading("uti_level1");
  const expanded = expandCriteriaWithCommon(gradingData.rubric);

  const introName = expanded.find((criterion) => criterion.id === "professional_intro_name");
  const preferredName = expanded.find((criterion) => criterion.id === "professional_preferred_name");
  const chiefComplaint = expanded.find((criterion) => criterion.id === "reporter_chief_complaint");

  assert.ok(introName);
  assert.ok(preferredName);
  assert.ok(chiefComplaint);
  assert.equal(preferredName.points, 0.5);
  assert.equal(chiefComplaint.section, "reporter");
  assert.ok(expanded.length > gradingData.rubric.criteria.length);
});
