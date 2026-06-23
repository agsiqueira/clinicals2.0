#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { expandCriteriaWithCommon } = require("../src/utils/rubricCommon");

const CASES_DIR = path.resolve(__dirname, "../../cases");

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function roundTo(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((toNumber(value) + Number.EPSILON) * factor) / factor;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function collectGradingFiles(caseId) {
  if (caseId) {
    return [`${caseId}_grading.json`];
  }

  return fs
    .readdirSync(CASES_DIR)
    .filter((name) => name.endsWith("_grading.json"))
    .sort((a, b) => a.localeCompare(b));
}

function buildAudit(gradingData) {
  const rubric = gradingData?.rubric || {};
  const sectionDefs = Array.isArray(rubric.sections) ? rubric.sections : [];
  const criteria = expandCriteriaWithCommon(rubric);

  const warnings = [];
  const sectionSummary = {};
  const knownSections = new Set(sectionDefs.map((section) => section.id));
  const disabledCriteria = [];

  sectionDefs.forEach((section) => {
    sectionSummary[section.id] = {
      label: section.label || section.id,
      max_points: toNumber(section.max_points),
      enabled_points: 0,
      omitted_points: 0,
      total_points: 0,
      criteria_count: 0,
      enabled_count: 0,
      omitted_count: 0
    };
  });

  criteria.forEach((criterion) => {
    const id = String(criterion?.id || "").trim();
    const section = String(criterion?.section || "").trim();
    const points = toNumber(criterion?.points);
    const enabled = criterion?.enabled !== false;

    if (!id) {
      warnings.push("A criterion is missing id.");
      return;
    }
    if (!section) {
      warnings.push(`Criterion "${id}" is missing section.`);
      return;
    }
    if (points < 0) {
      warnings.push(`Criterion "${id}" has negative points (${points}).`);
    }
    if (!knownSections.has(section)) {
      warnings.push(`Criterion "${id}" uses unknown section "${section}".`);
    }

    if (!sectionSummary[section]) {
      sectionSummary[section] = {
        label: section,
        max_points: 0,
        enabled_points: 0,
        omitted_points: 0,
        total_points: 0,
        criteria_count: 0,
        enabled_count: 0,
        omitted_count: 0
      };
    }

    const bucket = sectionSummary[section];
    bucket.criteria_count += 1;
    bucket.total_points += points;
    if (enabled) {
      bucket.enabled_count += 1;
      bucket.enabled_points += points;
    } else {
      bucket.omitted_count += 1;
      bucket.omitted_points += points;
      disabledCriteria.push({
        id,
        section,
        points,
        omit_reason: criterion?.omit_reason || ""
      });
      if (!String(criterion?.omit_reason || "").trim()) {
        warnings.push(`Disabled criterion "${id}" is missing omit_reason.`);
      }
    }
  });

  Object.entries(sectionSummary).forEach(([sectionId, stats]) => {
    const sectionMax = toNumber(stats.max_points);
    if (sectionMax <= 0) return;

    if (Math.abs(stats.enabled_points - sectionMax) > 0.0001) {
      warnings.push(
        `Section "${sectionId}" enabled points (${roundTo(
          stats.enabled_points
        )}) do not match max_points (${roundTo(sectionMax)}).`
      );
    }
  });

  const totals = Object.values(sectionSummary).reduce(
    (acc, section) => {
      acc.max_points += toNumber(section.max_points);
      acc.enabled_points += section.enabled_points;
      acc.omitted_points += section.omitted_points;
      acc.total_points += section.total_points;
      return acc;
    },
    { max_points: 0, enabled_points: 0, omitted_points: 0, total_points: 0 }
  );

  return {
    warnings,
    section_summary: Object.fromEntries(
      Object.entries(sectionSummary).map(([sectionId, section]) => [
        sectionId,
        {
          ...section,
          max_points: roundTo(section.max_points),
          enabled_points: roundTo(section.enabled_points),
          omitted_points: roundTo(section.omitted_points),
          total_points: roundTo(section.total_points)
        }
      ])
    ),
    disabled_criteria: disabledCriteria,
    totals: {
      max_points: roundTo(totals.max_points),
      enabled_points: roundTo(totals.enabled_points),
      omitted_points: roundTo(totals.omitted_points),
      total_points: roundTo(totals.total_points)
    }
  };
}

function printAudit(caseId, audit) {
  console.log(`\n=== Rubric Audit: ${caseId} ===`);
  console.log("Totals:", audit.totals);
  console.log("Section summary:");
  Object.entries(audit.section_summary).forEach(([sectionId, section]) => {
    console.log(
      `  - ${sectionId}: enabled ${section.enabled_points}/${section.max_points} ` +
        `(omitted ${section.omitted_points}, criteria ${section.enabled_count}/${section.criteria_count})`
    );
  });

  if (audit.disabled_criteria.length) {
    console.log("Disabled criteria:");
    audit.disabled_criteria.forEach((criterion) => {
      const reason = criterion.omit_reason || "(missing omit_reason)";
      console.log(`  - ${criterion.id} [${criterion.section}, ${criterion.points}]: ${reason}`);
    });
  } else {
    console.log("Disabled criteria: none");
  }

  if (audit.warnings.length) {
    console.log("Warnings:");
    audit.warnings.forEach((warning) => console.log(`  - ${warning}`));
  } else {
    console.log("Warnings: none");
  }
}

function run() {
  const caseIdArg = process.argv[2] ? String(process.argv[2]).trim() : "";
  const gradingFiles = collectGradingFiles(caseIdArg || null);
  if (!gradingFiles.length) {
    console.error("No grading files found.");
    process.exit(1);
  }

  let hadWarnings = false;

  gradingFiles.forEach((fileName) => {
    const filePath = path.join(CASES_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      console.error(`Missing file: ${filePath}`);
      hadWarnings = true;
      return;
    }

    const gradingData = readJson(filePath);
    const caseId = gradingData?.case_id || fileName.replace("_grading.json", "");
    const audit = buildAudit(gradingData);
    printAudit(caseId, audit);

    if (audit.warnings.length) {
      hadWarnings = true;
    }
  });

  process.exit(hadWarnings ? 2 : 0);
}

run();
