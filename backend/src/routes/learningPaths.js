const express = require("express");

const prisma = require("../db/prisma");
const { getOrCreateUser } = require("../utils/userResolver");
const { buildLearningPathRoadmap, buildSessionOverview } = require("../utils/roadmap");

const router = express.Router();

function getClerkUserId(req) {
  return req.header("x-clerk-user-id");
}

async function resolveUser(req) {
  const clerkUserId = getClerkUserId(req);
  if (!clerkUserId) {
    return null;
  }
  const name = req.header("x-user-name") || undefined;
  const email = req.header("x-user-email") || undefined;
  const imageUrl = req.header("x-user-image") || undefined;
  return getOrCreateUser(clerkUserId, { name, email, imageUrl });
}

router.get("/", async (req, res, next) => {
  try {
    const user = await resolveUser(req);
    if (!user) {
      res.status(401).json({ error: "Missing x-clerk-user-id header" });
      return;
    }

    const paths = await prisma.learningPath.findMany({
      where: { active: true },
      include: {
        preceptorPersona: true,
        units: {
          where: { active: true },
          include: {
            sessions: {
              where: { active: true },
              include: {
                achievements: {
                  where: { active: true },
                },
                attempts: {
                  where: { userId: user.id },
                  orderBy: [{ scoredAt: "desc" }, { submittedAt: "desc" }, { startedAt: "desc" }],
                },
              },
            },
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    res.json(buildLearningPathRoadmap(paths));
  } catch (err) {
    next(err);
  }
});

router.get("/patient-sessions/:slug", async (req, res, next) => {
  try {
    const user = await resolveUser(req);
    if (!user) {
      res.status(401).json({ error: "Missing x-clerk-user-id header" });
      return;
    }

    const session = await prisma.patientSession.findFirst({
      where: {
        slug: req.params.slug,
        active: true,
      },
      include: {
        patientCase: true,
        achievements: {
          where: { active: true },
        },
        unit: {
          include: {
            learningPath: {
              include: {
                preceptorPersona: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      res.status(404).json({ error: "Patient session not found" });
      return;
    }

    res.json(
      buildSessionOverview({
        session,
        preceptorPersona: session.unit?.learningPath?.preceptorPersona,
      })
    );
  } catch (err) {
    next(err);
  }
});

module.exports = router;
