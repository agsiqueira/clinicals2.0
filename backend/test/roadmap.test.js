const test = require("node:test");
const assert = require("node:assert/strict");

const { buildLearningPathRoadmap, buildSessionOverview } = require("../src/utils/roadmap");

function makeSession({ slug, title, sortOrder, attempts = [], achievements }) {
  return {
    id: `${slug}-id`,
    slug,
    title,
    objective: `Objective for ${title}`,
    description: `Description for ${title}`,
    estimatedMinutesMin: 3,
    estimatedMinutesMax: 5,
    goldThreshold: 84,
    silverThreshold: 50,
    bronzeThreshold: 1,
    sortOrder,
    achievements: achievements || [
      {
        id: `${slug}-achievement`,
        slug: "formal-introduction",
        title: "Formal Introduction",
        weightPercent: 50,
        rubricCriterionIds: ["professional_intro_name"],
      },
    ],
    attempts,
  };
}

test("buildLearningPathRoadmap returns nested path data with user session status", () => {
  const roadmap = buildLearningPathRoadmap([
    {
      id: "path-1",
      slug: "clinical-encounter-foundations",
      title: "Clinical Encounter Foundations",
      description: "Foundational patient interview and clinical encounter skills.",
      active: true,
      sortOrder: 1,
      preceptorPersona: {
        id: "preceptor-1",
        slug: "dr-martinez",
        name: "Dr. Martinez",
        specialty: "Clinical Preceptor",
        description: "Persistent AI preceptor.",
        avatarUrl: null,
      },
      units: [
        {
          id: "unit-1",
          slug: "unit-1-clinical-encounter",
          title: "Unit 1: The Clinical Encounter",
          objective: "Learn how to begin a patient encounter.",
          active: true,
          sortOrder: 1,
          sessions: [
            makeSession({
              slug: "first-patient",
              title: "First Patient: Introduction and Chief Complaint",
              sortOrder: 1,
              attempts: [
                {
                  sessionScore: 100,
                  badgeTier: "GOLD",
                  scoredAt: "2026-06-20T10:00:00.000Z",
                },
              ],
            }),
            makeSession({
              slug: "first-patient-hpi",
              title: "First Patient: Complete HPI",
              sortOrder: 2,
              attempts: [],
              achievements: [
                {
                  id: "hpi-formal-introduction",
                  slug: "formal-introduction",
                  title: "Formal Introduction",
                  weightPercent: 33.33,
                  requiredForCompletion: true,
                  rubricCriterionIds: ["professional_intro_name"],
                },
                {
                  id: "hpi-chief-complaint",
                  slug: "chief-complaint",
                  title: "Chief Complaint",
                  weightPercent: 33.33,
                  requiredForCompletion: true,
                  rubricCriterionIds: ["reporter_chief_complaint"],
                },
                {
                  id: "hpi-summary",
                  slug: "hpi-summary",
                  title: "HPI Summary",
                  weightPercent: 33.33,
                  requiredForCompletion: true,
                  rubricCriterionIds: ["reporter_hpi_summary_oldcarts"],
                },
              ],
            }),
            makeSession({
              slug: "third-patient",
              title: "Third Patient",
              sortOrder: 3,
              attempts: [],
            }),
          ],
        },
      ],
    },
  ]);

  const sessions = roadmap[0].units[0].sessions;
  assert.equal(roadmap[0].preceptorPersona.slug, "dr-martinez");
  assert.equal(sessions[0].status, "completed");
  assert.equal(sessions[0].badgeTier, "GOLD");
  assert.equal(sessions[0].bestSessionScore, 100);
  assert.equal(sessions[1].status, "available");
  assert.equal(sessions[2].status, "locked");
  assert.equal(sessions[0].requiresHpi, false);
  assert.equal(sessions[0].workflow.requiresHpi, false);
  assert.equal(sessions[1].slug, "first-patient-hpi");
  assert.equal(sessions[1].requiresHpi, true);
  assert.equal(sessions[1].workflow.requiresHpi, true);
  assert.equal(sessions[1].achievements[2].slug, "hpi-summary");
  assert.equal(sessions[1].achievements[2].requiredForCompletion, true);
  assert.deepEqual(sessions[0].badgeThresholds, { gold: 84, silver: 50, bronze: 1 });
  assert.equal(sessions[0].achievements[0].slug, "formal-introduction");
});

test("buildSessionOverview returns First Patient overview and preceptor briefing", () => {
  const overview = buildSessionOverview({
    preceptorPersona: {
      id: "preceptor-1",
      slug: "dr-martinez",
      name: "Dr. Martinez",
      specialty: "Clinical Preceptor",
      avatarUrl: null,
    },
    session: {
      ...makeSession({ slug: "first-patient", title: "First Patient", sortOrder: 1 }),
      objective: "Meet your first patient and begin the clinical encounter.",
      patientCase: {
        id: "case-db-id",
        caseId: "uti_level1",
        title: "UTI Level 1",
        level: 1,
        setting: "telehealth_outpatient",
      },
    },
  });

  assert.equal(overview.slug, "first-patient");
  assert.equal(overview.linkedCase.caseId, "uti_level1");
  assert.deepEqual(overview.estimatedTime, { min: 3, max: 5 });
  assert.match(overview.preceptorBriefing, /Dr\. Martinez/);
  assert.match(overview.preceptorBriefing, /Formal Introduction/);
  assert.equal(overview.badgeThresholds.gold, 84);
  assert.equal(overview.requiresHpi, false);
  assert.equal(overview.workflow.requiresHpi, false);
});

test("first-patient-hpi remains locked until first-patient best score is at least 84", () => {
  const makeRoadmapForScore = (score) =>
    buildLearningPathRoadmap([
      {
        id: "path-1",
        slug: "clinical-encounter-foundations",
        title: "Clinical Encounter Foundations",
        description: "Foundational patient interview and clinical encounter skills.",
        active: true,
        sortOrder: 1,
        preceptorPersona: null,
        units: [
          {
            id: "unit-1",
            slug: "unit-1-clinical-encounter",
            title: "Unit 1: The Clinical Encounter",
            objective: "Learn how to begin a patient encounter.",
            active: true,
            sortOrder: 1,
            sessions: [
              makeSession({
                slug: "first-patient",
                title: "First Patient: Introduction and Chief Complaint",
                sortOrder: 1,
                attempts: [
                  {
                    sessionScore: score,
                    badgeTier: score > 0 ? "BRONZE" : "NONE",
                    scoredAt: "2026-06-20T10:00:00.000Z",
                  },
                ],
              }),
              makeSession({
                slug: "first-patient-hpi",
                title: "First Patient: Complete HPI",
                sortOrder: 2,
                attempts: [],
                achievements: [
                  {
                    id: "hpi-summary",
                    slug: "hpi-summary",
                    title: "HPI Summary",
                    weightPercent: 33.33,
                    requiredForCompletion: true,
                    rubricCriterionIds: ["reporter_hpi_summary_oldcarts"],
                  },
                ],
              }),
            ],
          },
        ],
      },
    ]);

  const belowThreshold = makeRoadmapForScore(83.99);
  const atThreshold = makeRoadmapForScore(84);

  assert.equal(belowThreshold[0].units[0].sessions[1].status, "locked");
  assert.equal(atThreshold[0].units[0].sessions[1].status, "available");
});

test("first session in the first unit is available by default", () => {
  const roadmap = buildLearningPathRoadmap([
    {
      id: "path-1",
      slug: "clinical-encounter-foundations",
      title: "Clinical Encounter Foundations",
      description: "Foundational patient interview and clinical encounter skills.",
      active: true,
      sortOrder: 1,
      preceptorPersona: null,
      units: [
        {
          id: "unit-1",
          slug: "unit-1-clinical-encounter",
          title: "Unit 1: The Clinical Encounter",
          objective: "Learn how to begin a patient encounter.",
          active: true,
          sortOrder: 1,
          sessions: [
            makeSession({
              slug: "first-patient",
              title: "First Patient: Introduction and Chief Complaint",
              sortOrder: 1,
              attempts: [],
            }),
          ],
        },
      ],
    },
  ]);

  assert.equal(roadmap[0].units[0].sessions[0].status, "available");
});

test("first session in Unit 2 unlocks only after Unit 1 final session score is at least 84", () => {
  const makeRoadmapForFinalUnitOneScore = (score) =>
    buildLearningPathRoadmap([
      {
        id: "path-1",
        slug: "clinical-encounter-foundations",
        title: "Clinical Encounter Foundations",
        description: "Foundational patient interview and clinical encounter skills.",
        active: true,
        sortOrder: 1,
        preceptorPersona: null,
        units: [
          {
            id: "unit-1",
            slug: "unit-1-clinical-encounter",
            title: "Unit 1: The Clinical Encounter",
            objective: "Learn how to begin a patient encounter.",
            active: true,
            sortOrder: 1,
            sessions: [
              makeSession({
                slug: "first-patient",
                title: "First Patient: Introduction and Chief Complaint",
                sortOrder: 1,
                attempts: [
                  {
                    sessionScore: 100,
                    badgeTier: "GOLD",
                    scoredAt: "2026-06-20T10:00:00.000Z",
                  },
                ],
              }),
              makeSession({
                slug: "first-patient-hpi",
                title: "First Patient: Complete HPI",
                sortOrder: 2,
                attempts: [
                  {
                    sessionScore: score,
                    badgeTier: score > 0 ? "BRONZE" : "NONE",
                    scoredAt: "2026-06-21T10:00:00.000Z",
                  },
                ],
              }),
            ],
          },
          {
            id: "unit-2",
            slug: "seasonal-allergies",
            title: "Seasonal Allergies",
            objective: "Practice allergy-focused encounters.",
            active: true,
            sortOrder: 2,
            sessions: [
              makeSession({
                slug: "seasonal-allergies-complete-hpi",
                title: "Seasonal Allergies: Complete HPI",
                sortOrder: 1,
                attempts: [],
                achievements: [
                  {
                    id: "seasonal-formal-introduction",
                    slug: "formal-introduction",
                    title: "Formal Introduction",
                    weightPercent: 33.33,
                    requiredForCompletion: true,
                    rubricCriterionIds: ["professional_intro_name"],
                  },
                  {
                    id: "seasonal-chief-complaint",
                    slug: "chief-complaint",
                    title: "Chief Complaint",
                    weightPercent: 33.33,
                    requiredForCompletion: true,
                    rubricCriterionIds: ["reporter_chief_complaint"],
                  },
                  {
                    id: "seasonal-hpi-summary",
                    slug: "hpi-summary",
                    title: "HPI Summary",
                    weightPercent: 33.34,
                    requiredForCompletion: true,
                    rubricCriterionIds: ["reporter_hpi_summary_oldcarts"],
                  },
                ],
              }),
            ],
          },
        ],
      },
    ]);

  const belowThreshold = makeRoadmapForFinalUnitOneScore(83.99);
  const atThreshold = makeRoadmapForFinalUnitOneScore(84);

  assert.equal(belowThreshold[0].units[1].sessions[0].status, "locked");
  assert.equal(atThreshold[0].units[1].sessions[0].status, "available");
  assert.equal(atThreshold[0].units[1].sessions.length, 1);
  assert.equal(atThreshold[0].units[1].sessions[0].slug, "seasonal-allergies-complete-hpi");
  assert.equal(atThreshold[0].units[1].sessions[0].requiresHpi, true);
  assert.equal(atThreshold[0].units[1].sessions[0].achievements.length, 3);
});
