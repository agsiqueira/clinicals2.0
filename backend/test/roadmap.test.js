const test = require("node:test");
const assert = require("node:assert/strict");

const { buildLearningPathRoadmap, buildSessionOverview } = require("../src/utils/roadmap");

function makeSession({ slug, title, sortOrder, attempts = [] }) {
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
    achievements: [
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
              title: "First Patient",
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
              slug: "second-patient",
              title: "Second Patient",
              sortOrder: 2,
              attempts: [],
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
});
