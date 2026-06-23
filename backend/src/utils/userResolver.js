const prisma = require("../db/prisma");

function buildUserUpdate(meta) {
  const update = {};
  if (meta.name) update.name = meta.name;
  if (meta.email) update.email = meta.email;
  if (meta.imageUrl) update.imageUrl = meta.imageUrl;
  return update;
}

async function getOrCreateUser(clerkUserId, meta = {}) {
  if (!clerkUserId) {
    throw new Error("Missing clerk user id");
  }
  const update = buildUserUpdate(meta);
  return prisma.user.upsert({
    where: { clerkUserId },
    create: {
      clerkUserId,
      name: meta.name || null,
      email: meta.email || null,
      imageUrl: meta.imageUrl || null
    },
    update
  });
}

module.exports = { getOrCreateUser };
