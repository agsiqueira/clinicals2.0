const dotenv = require("dotenv");

const prisma = require("../src/db/prisma");
const { syncAllCases } = require("../src/utils/caseSync");
const { loadGrading } = require("../src/utils/caseLoader");

dotenv.config();

const FIRST_PATIENT_CASE_ID = "uti_level1";
const SEASONAL_ALLERGIES_CASE_ID = "seasonal_allergies_level1";

const FORMAL_INTRODUCTION_CRITERIA = [
  "professional_intro_name",
  "professional_intro_role_title",
  "professional_preferred_name",
  "professional_identity_two_identifiers",
  "professional_communication_humanism",
];

const CHIEF_COMPLAINT_CRITERIA = ["reporter_chief_complaint"];
const HPI_SUMMARY_CRITERIA = ["reporter_hpi_summary_oldcarts"];

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

async function upsertAchievement({
  patientSessionId,
  slug,
  title,
  weightPercent,
  rubricCriterionIds,
  sortOrder,
  requiredForCompletion = false,
}) {
  return prisma.achievement.upsert({
    where: {
      patientSessionId_slug: {
        patientSessionId,
        slug,
      },
    },
    create: {
      patientSessionId,
      slug,
      title,
      weightPercent,
      rubricCriterionIds,
      requiredForCompletion,
      sortOrder,
      active: true,
    },
    update: {
      title,
      weightPercent,
      rubricCriterionIds,
      requiredForCompletion,
      sortOrder,
      active: true,
    },
  });
}

async function validateRubricMappingsForCase(caseId) {
  const gradingData = await loadGrading(caseId);
  if (!gradingData) {
    console.warn(`[seed] No grading rubric found for ${caseId}.`);
    return;
  }

  const availableIds = collectRubricCriterionIds(gradingData);
  const mappedIds = [
    ...FORMAL_INTRODUCTION_CRITERIA,
    ...CHIEF_COMPLAINT_CRITERIA,
    ...HPI_SUMMARY_CRITERIA,
  ];
  const missingIds = mappedIds.filter((id) => !availableIds.has(id));

  if (missingIds.length > 0) {
    console.warn(`[seed] ${caseId} missing mapped rubric criteria: ${missingIds.join(", ")}`);
  }
}

async function validateRubricMappings() {
  await validateRubricMappingsForCase(FIRST_PATIENT_CASE_ID);
  await validateRubricMappingsForCase(SEASONAL_ALLERGIES_CASE_ID);
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

  const seasonalAllergiesCase = await prisma.case.findUnique({
    where: { caseId: SEASONAL_ALLERGIES_CASE_ID },
  });

  if (!seasonalAllergiesCase) {
    throw new Error(
      `Case ${SEASONAL_ALLERGIES_CASE_ID} was not found after case sync. Cannot seed Seasonal Allergies.`
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
      title: "First Patient: Introduction and Chief Complaint",
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
      title: "First Patient: Introduction and Chief Complaint",
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

  await upsertAchievement({
    patientSessionId: patientSession.id,
    slug: "formal-introduction",
    title: "Formal Introduction",
    weightPercent: 50,
    rubricCriterionIds: FORMAL_INTRODUCTION_CRITERIA,
    sortOrder: 1,
  });

  await upsertAchievement({
    patientSessionId: patientSession.id,
    slug: "chief-complaint",
    title: "Chief Complaint",
    weightPercent: 50,
    rubricCriterionIds: CHIEF_COMPLAINT_CRITERIA,
    sortOrder: 2,
  });

  const hpiPatientSession = await prisma.patientSession.upsert({
    where: {
      unitId_slug: {
        unitId: unit.id,
        slug: "first-patient-hpi",
      },
    },
    create: {
      unitId: unit.id,
      caseId: patientCase.id,
      slug: "first-patient-hpi",
      title: "First Patient: Complete HPI",
      objective: "Complete the patient encounter and submit an HPI summary.",
      description:
        "Practice a professional opening, elicit the chief complaint, and complete an OLDCARTS-focused HPI.",
      goldThreshold: 84,
      silverThreshold: 50,
      bronzeThreshold: 1,
      estimatedMinutesMin: 5,
      estimatedMinutesMax: 8,
      sortOrder: 2,
      active: true,
    },
    update: {
      caseId: patientCase.id,
      title: "First Patient: Complete HPI",
      objective: "Complete the patient encounter and submit an HPI summary.",
      description:
        "Practice a professional opening, elicit the chief complaint, and complete an OLDCARTS-focused HPI.",
      goldThreshold: 84,
      silverThreshold: 50,
      bronzeThreshold: 1,
      estimatedMinutesMin: 5,
      estimatedMinutesMax: 8,
      sortOrder: 2,
      active: true,
    },
  });

  await upsertAchievement({
    patientSessionId: hpiPatientSession.id,
    slug: "formal-introduction",
    title: "Formal Introduction",
    weightPercent: 33.33,
    rubricCriterionIds: FORMAL_INTRODUCTION_CRITERIA,
    requiredForCompletion: true,
    sortOrder: 1,
  });

  await upsertAchievement({
    patientSessionId: hpiPatientSession.id,
    slug: "chief-complaint",
    title: "Chief Complaint",
    weightPercent: 33.33,
    rubricCriterionIds: CHIEF_COMPLAINT_CRITERIA,
    requiredForCompletion: true,
    sortOrder: 2,
  });

  await upsertAchievement({
    patientSessionId: hpiPatientSession.id,
    slug: "hpi-summary",
    title: "HPI Summary",
    weightPercent: 33.33,
    rubricCriterionIds: HPI_SUMMARY_CRITERIA,
    requiredForCompletion: true,
    sortOrder: 3,
  });

  const unit2 = await prisma.unit.upsert({
    where: {
      learningPathId_slug: {
        learningPathId: learningPath.id,
        slug: "seasonal-allergies",
      },
    },
    create: {
      learningPathId: learningPath.id,
      slug: "seasonal-allergies",
      title: "Seasonal Allergies",
      objective:
        "Practice beginning an allergy-focused visit and collecting the key symptom history.",
      sortOrder: 2,
      active: true,
    },
    update: {
      title: "Seasonal Allergies",
      objective:
        "Practice beginning an allergy-focused visit and collecting the key symptom history.",
      sortOrder: 2,
      active: true,
    },
  });

  const seasonalHpiSession = await prisma.patientSession.upsert({
    where: {
      unitId_slug: {
        unitId: unit2.id,
        slug: "seasonal-allergies-complete-hpi",
      },
    },
    create: {
      unitId: unit2.id,
      caseId: seasonalAllergiesCase.id,
      slug: "seasonal-allergies-complete-hpi",
      title: "Seasonal Allergies: Complete HPI",
      objective: "Complete Sarah Johnson's seasonal allergy encounter and submit an HPI.",
      description:
        "Practice a professional opening, elicit the chief complaint, and summarize the key allergy HPI facts.",
      goldThreshold: 84,
      silverThreshold: 50,
      bronzeThreshold: 1,
      estimatedMinutesMin: 5,
      estimatedMinutesMax: 8,
      sortOrder: 1,
      active: true,
    },
    update: {
      caseId: seasonalAllergiesCase.id,
      title: "Seasonal Allergies: Complete HPI",
      objective: "Complete Sarah Johnson's seasonal allergy encounter and submit an HPI.",
      description:
        "Practice a professional opening, elicit the chief complaint, and summarize the key allergy HPI facts.",
      goldThreshold: 84,
      silverThreshold: 50,
      bronzeThreshold: 1,
      estimatedMinutesMin: 5,
      estimatedMinutesMax: 8,
      sortOrder: 1,
      active: true,
    },
  });

  await upsertAchievement({
    patientSessionId: seasonalHpiSession.id,
    slug: "formal-introduction",
    title: "Formal Introduction",
    weightPercent: 33.33,
    rubricCriterionIds: FORMAL_INTRODUCTION_CRITERIA,
    requiredForCompletion: true,
    sortOrder: 1,
  });

  await upsertAchievement({
    patientSessionId: seasonalHpiSession.id,
    slug: "chief-complaint",
    title: "Chief Complaint",
    weightPercent: 33.33,
    rubricCriterionIds: CHIEF_COMPLAINT_CRITERIA,
    requiredForCompletion: true,
    sortOrder: 2,
  });

  await upsertAchievement({
    patientSessionId: seasonalHpiSession.id,
    slug: "hpi-summary",
    title: "HPI Summary",
    weightPercent: 33.34,
    rubricCriterionIds: HPI_SUMMARY_CRITERIA,
    requiredForCompletion: true,
    sortOrder: 3,
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
