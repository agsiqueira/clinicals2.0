const fs = require("fs");
const path = require("path");
const { loadCase, loadGrading } = require("../src/utils/caseLoader");
const { gradeConversation } = require("../src/utils/grading");

const FIXTURES_DIR = path.resolve(__dirname, "fixtures");

function loadFixtures() {
  return fs
    .readdirSync(FIXTURES_DIR)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => {
      const filePath = path.join(FIXTURES_DIR, name);
      return { name, ...JSON.parse(fs.readFileSync(filePath, "utf8")) };
    });
}

function pad(str, len) {
  return String(str || "").padEnd(len).slice(0, len);
}

async function runFixture(fixture) {
  const { case_id, conversation, hpi } = fixture;

  const [caseData, gradingData] = await Promise.all([
    loadCase(case_id),
    loadGrading(case_id),
  ]);

  if (!caseData || !gradingData) {
    return { error: `Case or grading data not found for: ${case_id}` };
  }

  const result = await gradeConversation({
    caseData,
    gradingData,
    conversation,
    supplementalInputs: { hpi: String(hpi || "").trim() },
  });

  return result;
}

async function run() {
  if (!process.env.GRADING_LLM_DISABLED) {
    console.warn(
      "Warning: GRADING_LLM_DISABLED is not set. The LLM will be called for each fixture.\n" +
      "To run offline, set GRADING_LLM_DISABLED=true.\n"
    );
  }

  const fixtures = loadFixtures();
  if (!fixtures.length) {
    console.error("No fixture files found in scripts/fixtures/");
    process.exit(1);
  }

  console.log("\n=== Rubric Calibration Run ===\n");
  console.log(
    pad("Fixture", 20),
    pad("Score", 7),
    pad("Expected", 12),
    pad("Pass/Fail", 10),
    "Critical Fails"
  );
  console.log("-".repeat(75));

  let hadFailures = false;

  for (const fixture of fixtures) {
    const { name, description, expected_min_score, expected_max_score } = fixture;

    let result;
    try {
      result = await runFixture(fixture);
    } catch (err) {
      console.error(`  ERROR running ${name}: ${err.message}`);
      hadFailures = true;
      continue;
    }

    if (result.error) {
      console.error(`  ERROR in ${name}: ${result.error}`);
      hadFailures = true;
      continue;
    }

    const score = result.score;
    const inRange =
      score >= expected_min_score && score <= expected_max_score;

    if (!inRange) hadFailures = true;

    const rangeStr = `${expected_min_score}-${expected_max_score}%`;
    const status = inRange ? "PASS" : "FAIL !!";
    const criticals = result.critical_fails_triggered?.length
      ? result.critical_fails_triggered.join(", ")
      : "none";

    console.log(
      pad(name.replace(".json", ""), 20),
      pad(`${score}%`, 7),
      pad(rangeStr, 12),
      pad(status, 10),
      criticals
    );

    // section breakdown
    if (result.section_scores?.length) {
      result.section_scores.forEach((s) => {
        if (s.available_points > 0) {
          console.log(
            `  ${pad(s.label, 26)} ${s.earned_points}/${s.available_points} pts`
          );
        }
      });
    }

    // missed items
    if (result.missed_required_questions?.length) {
      console.log(`  Missed history: ${result.missed_required_questions.join(", ")}`);
    }
    if (result.missed_red_flags?.length) {
      console.log(`  Missed red flags: ${result.missed_red_flags.join(", ")}`);
    }

    console.log();
  }

  console.log("=".repeat(75));
  if (hadFailures) {
    console.log("Result: FAILED — one or more fixtures scored outside expected range.");
    process.exit(2);
  } else {
    console.log("Result: ALL PASSED");
    process.exit(0);
  }
}

run();
