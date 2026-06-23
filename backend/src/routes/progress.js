const express = require("express");
const { getOrCreateUser } = require("../utils/userResolver");
const { syncUserProgress } = require("../services/userProgress");

const router = express.Router();

function getClerkUserId(req) {
  return req.header("x-clerk-user-id");
}

async function resolveUser(req) {
  const clerkUserId = getClerkUserId(req);
  if (!clerkUserId) {
    const error = new Error("Missing x-clerk-user-id header");
    error.status = 401;
    throw error;
  }

  const name = req.header("x-user-name") || undefined;
  const email = req.header("x-user-email") || undefined;
  const imageUrl = req.header("x-user-image") || undefined;

  return getOrCreateUser(clerkUserId, { name, email, imageUrl });
}

router.get("/", async (req, res, next) => {
  try {
    const user = await resolveUser(req);
    const summary = await syncUserProgress(user.id);

    res.json({
      points: summary.totalPoints,
      level: summary.level,
      best_cases: summary.bestCases,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
