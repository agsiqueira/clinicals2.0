const dotenv = require("dotenv");

const prisma = require("../src/db/prisma");
const { syncAllCases } = require("../src/utils/caseSync");
const { loadGrading } = require("../src/utils/caseLoader");

dotenv.config();

const FIRST_PATIENT_CASE_ID = "uti_level1";

const FORMAL_INTRODUCTION_CRITERIA = [
  "professional_intro_name",
  "professional_intro_role_title",
  "professional_preferred_name",
  "professional_identity_two_identifiers",
  "professional_communication_humanism",
];

const CHIEF_COMPLAINT_CRITERIA = ["reporter_chief_complaint"];

function collectRubricCriterionIds(gradingData) {
  const rubric = gradingData?.rubric || {};
  const ids = new Set();

  for (const item of rubric.common_criteria || []) {
    if (typeof item === "string") ids.add(item);
    else if (item?.id) ids.add(item.id);
  }

  for (const item of rubric.criteria || []) {
    if (item?.id) ids.add(item.id);
  }

  return ids;
}

async function validateRubricMappings() {
  const gradingData = await loadGrading(FIRST_PATIENT_CASE_ID);
  if (!gradingData) {
    console.warn(`[seed] No grading rubric found for ${FIRST_PATIENT_CASE_ID}.`);
    return;
  }

  const availableIds = collectRubricCriterionIds(gradingData);
  const mappedIds = [...FORMAL_INTRODUCTION_CRITERIA, ...CHIEF_COMPLAINT_CRITERIA];
  const missingIds = mappedIds.filter((id) => !availableIds.has(id));

  if (missingIds.length > 0) {
    console.warn(`[seed] Missing mapped rubric criteria: ${missingIds.join(", ")}`);
  }
}

async function seedClinicals2() {
  const syncedCount = await syncAllCases();
  console.log(`[seed] Synced ${syncedCount} case(s).`);

  await validateRubricMappings();

  const patientCase = await prisma.case.findUnique({
    where: { caseId: FIRST_PATIENT_CASE_ID },
  });

  if (!patientCase) {
    throw new Error(
      `Case ${FIRST_PATIENT_CASE_ID} was not found after case sync. Cannot seed First Patient.`
    );
  }

  const preceptorPersona = await prisma.preceptorPersona.upsert({
    where: { slug: "dr-martinez" },
    create: {
      slug: "dr-martinez",
      name: "Dr. Martinez",
      specialty: "Clinical Preceptor",
      description: "Persistent AI preceptor for foundational clinical encounter skills.",
      systemPrompt:
        "Support the learner as a clinical mentor using Recognition -> Coaching -> Encouragement.",
      active: true,
    },
    update: {
      name: "Dr. Martinez",
      specialty: "Clinical Preceptor",
      description: "Persistent AI preceptor for foundational clinical encounter skills.",
      systemPrompt:
        "Support the learner as a clinical mentor using Recognition -> Coaching -> Encouragement.",
      active: true,
    },
  });

  const learningPath = await prisma.learningPath.upsert({
    where: { slug: "clinical-encounter-foundations" },
    create: {
      slug: "clinical-encounter-foundations",
      title: "Clinical Encounter Foundations",
      description: "Foundational patient interview and clinical encounter skills.",
      preceptorPersonaId: preceptorPersona.id,
      sortOrder: 1,
      active: true,
    },
    update: {
      title: "Clinical Encounter Foundations",
      description: "Foundational patient interview and clinical encounter skills.",
      preceptorPersonaId: preceptorPersona.id,
      sortOrder: 1,
      active: true,
    },
  });

  const unit = await prisma.unit.upsert({
    where: {
      learningPathId_slug: {
        learningPathId: learningPath.id,
        slug: "unit-1-clinical-encounter",
      },
    },
    create: {
      learningPathId: learningPath.id,
      slug: "unit-1-clinical-encounter",
      title: "Unit 1: The Clinical Encounter",
      objective:
        "Learn how to begin a patient encounter professionally and identify the main concern.",
      sortOrder: 1,
      active: true,
    },
    update: {
      title: "Unit 1: The Clinical Encounter",
      objective:
        "Learn how to begin a patient encounter professionally and identify the main concern.",
      sortOrder: 1,
      active: true,
    },
  });

  const patientSession = await prisma.patientSession.upsert({
    where: {
      unitId_slug: {
        unitId: unit.id,
        slug: "first-patient",
      },
    },
    create: {
      unitId: unit.id,
      caseId: patientCase.id,
      slug: "first-patient",
      title: "First Patient",
      objective: "Meet your first patient and begin the clinical encounter.",
      description:
        "Practice a professional opening and elicit the patient's chief complaint.",
      goldThreshold: 84,
      silverThreshold: 50,
      bronzeThreshold: 1,
      estimatedMinutesMin: 3,
      estimatedMinutesMax: 5,
      sortOrder: 1,
      active: true,
    },
    update: {
      caseId: patientCase.id,
      title: "First Patient",
      objective: "Meet your first patient and begin the clinical encounter.",
      description:
        "Practice a professional opening and elicit the patient's chief complaint.",
      goldThreshold: 84,
      silverThreshold: 50,
      bronzeThreshold: 1,
      estimatedMinutesMin: 3,
      estimatedMinutesMax: 5,
      sortOrder: 1,
      active: true,
    },
  });

  await prisma.achievement.upsert({
    where: {
      patientSessionId_slug: {
        patientSessionId: patientSession.id,
        slug: "formal-introduction",
      },
    },
    create: {
      patientSessionId: patientSession.id,
      slug: "formal-introduction",
      title: "Formal Introduction",
      weightPercent: 50,
      rubricCriterionIds: FORMAL_INTRODUCTION_CRITERIA,
      sortOrder: 1,
      active: true,
    },
    update: {
      title: "Formal Introduction",
      weightPercent: 50,
      rubricCriterionIds: FORMAL_INTRODUCTION_CRITERIA,
      sortOrder: 1,
      active: true,
    },
  });

  await prisma.achievement.upsert({
    where: {
      patientSessionId_slug: {
        patientSessionId: patientSession.id,
        slug: "chief-complaint",
      },
    },
    create: {
      patientSessionId: patientSession.id,
      slug: "chief-complaint",
      title: "Chief Complaint",
      weightPercent: 50,
      rubricCriterionIds: CHIEF_COMPLAINT_CRITERIA,
      sortOrder: 2,
      active: true,
    },
    update: {
      title: "Chief Complaint",
      weightPercent: 50,
      rubricCriterionIds: CHIEF_COMPLAINT_CRITERIA,
      sortOrder: 2,
      active: true,
    },
  });

  console.log("[seed] Clinicals 2.0 Phase 2 seed complete.");
}

seedClinicals2()
  .catch((err) => {
    console.error("[seed] Clinicals 2.0 seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
