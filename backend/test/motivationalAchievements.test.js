const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  MOTIVATIONAL_ACHIEVEMENT_DEFINITIONS,
  seedMotivationalAchievementDefinitions,
} = require("../src/services/motivationalAchievements");

test("motivational achievement definitions seed idempotently with upsert", async () => {
  const calls = [];
  const fakeClient = {
    motivationalAchievement: {
      upsert: async (args) => {
        calls.push(args);
        return { id: `${args.where.slug}-id`, ...args.create };
      },
    },
  };

  await seedMotivationalAchievementDefinitions(fakeClient);
  await seedMotivationalAchievementDefinitions(fakeClient);

  assert.equal(MOTIVATIONAL_ACHIEVEMENT_DEFINITIONS.length, 8);
  assert.equal(calls.length, MOTIVATIONAL_ACHIEVEMENT_DEFINITIONS.length * 2);
  assert.deepEqual(
    calls.slice(0, 8).map((call) => call.where.slug),
    [
      "streak-3-day",
      "streak-7-day",
      "first-gold-badge",
      "comeback-20-point-improvement",
      "hpi-builder",
      "gold-streak-3",
      "unit-complete",
      "clinical-foundations-complete",
    ]
  );

  for (const call of calls) {
    assert.equal(call.create.slug, call.where.slug);
    assert.equal(call.create.title, call.update.title);
    assert.equal(call.create.category, call.update.category);
    assert.equal(call.create.xpReward, call.update.xpReward);
    assert.equal(call.create.targetValue, call.update.targetValue);
    assert.equal(call.create.active, true);
  }
});

test("BadgeAward remains dedicated to session performance badges", () => {
  const schemaPath = path.resolve(__dirname, "../prisma/schema.prisma");
  const schema = fs.readFileSync(schemaPath, "utf8");
  const badgeAwardModel = schema.match(/model BadgeAward \{[\s\S]*?\n\}/)?.[0] || "";

  assert.ok(badgeAwardModel.includes("patientSessionId String"));
  assert.ok(badgeAwardModel.includes("sessionAttemptId String"));
  assert.ok(badgeAwardModel.includes("tier             BadgeTier"));
  assert.ok(badgeAwardModel.includes("@@unique([userId, patientSessionId, sessionAttemptId])"));
  assert.ok(!badgeAwardModel.includes("MotivationalAchievement"));
});
