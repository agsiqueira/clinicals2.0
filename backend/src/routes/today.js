const express = require("express");

const { buildToday } = require("../services/today");
const { getOrCreateUser } = require("../utils/userResolver");

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
    const today = await buildToday({ userId: user.id });

    res.json(today);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
