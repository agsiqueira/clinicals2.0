const prisma = require("../db/prisma");

const MOTIVATIONAL_ACHIEVEMENT_DEFINITIONS = [
  {
    slug: "streak-3-day",
    title: "3-Day Streak",
    category: "streak",
    icon: "🔥",
    targetValue: 3,
    xpReward: 25,
    sortOrder: 1,
  },
  {
    slug: "streak-7-day",
    title: "7-Day Streak",
    category: "streak",
    icon: "🔥",
    targetValue: 7,
    xpReward: 75,
    sortOrder: 2,
  },
  {
    slug: "first-gold-badge",
    title: "First Gold Badge",
    category: "milestone",
    icon: "🥇",
    targetValue: 1,
    xpReward: 50,
    sortOrder: 3,
  },
  {
    slug: "comeback-20-point-improvement",
    title: "Comeback Clinician",
    category: "improvement",
    icon: "📈",
    targetValue: 20,
    xpReward: 50,
    sortOrder: 4,
  },
  {
    slug: "hpi-builder",
    title: "HPI Builder",
    category: "competency",
    icon: "📝",
    targetValue: 3,
    xpReward: 75,
    sortOrder: 5,
  },
  {
    slug: "gold-streak-3",
    title: "Gold Streak",
    category: "mastery",
    icon: "🥇",
    targetValue: 3,
    xpReward: 100,
    sortOrder: 6,
  },
  {
    slug: "unit-complete",
    title: "Unit Complete",
    category: "progression",
    icon: "✅",
    targetValue: 1,
    xpReward: 50,
    sortOrder: 7,
  },
  {
    slug: "clinical-foundations-complete",
    title: "Clinical Foundations Complete",
    category: "progression",
    icon: "🏆",
    targetValue: 1,
    xpReward: 150,
    sortOrder: 8,
  },
];

function buildMotivationalAchievementUpsert(definition) {
  const data = {
    title: definition.title,
    description: definition.description || null,
    category: definition.category,
    icon: definition.icon || null,
    xpReward: definition.xpReward || 0,
    targetValue: definition.targetValue ?? null,
    active: definition.active ?? true,
    sortOrder: definition.sortOrder || 0,
    criteria: definition.criteria || null,
  };

  return {
    where: { slug: definition.slug },
    create: {
      slug: definition.slug,
      ...data,
    },
    update: data,
  };
}

async function seedMotivationalAchievementDefinitions(client = prisma) {
  const results = [];

  for (const definition of MOTIVATIONAL_ACHIEVEMENT_DEFINITIONS) {
    results.push(
      await client.motivationalAchievement.upsert(
        buildMotivationalAchievementUpsert(definition)
      )
    );
  }

  return results;
}

module.exports = {
  MOTIVATIONAL_ACHIEVEMENT_DEFINITIONS,
  buildMotivationalAchievementUpsert,
  seedMotivationalAchievementDefinitions,
};
