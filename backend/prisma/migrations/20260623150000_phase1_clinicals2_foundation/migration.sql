-- CreateEnum
CREATE TYPE "BadgeTier" AS ENUM ('GOLD', 'SILVER', 'BRONZE', 'NONE');

-- CreateEnum
CREATE TYPE "SessionAttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'SCORED');

-- CreateEnum
CREATE TYPE "XPEventType" AS ENUM ('SESSION_STARTED', 'SESSION_COMPLETED', 'ACHIEVEMENT_EARNED', 'BADGE_AWARDED', 'STREAK_BONUS', 'MANUAL_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PreceptorMessageType" AS ENUM ('BRIEFING', 'DEBRIEFING', 'ACHIEVEMENT', 'IMPROVEMENT', 'STREAK', 'RE_ENGAGEMENT', 'GOAL', 'GENERAL');

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN "sessionAttemptId" TEXT;

-- CreateTable
CREATE TABLE "PreceptorPersona" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "specialty" TEXT,
    "description" TEXT,
    "avatarUrl" TEXT,
    "systemPrompt" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreceptorPersona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningPath" (
    "id" TEXT NOT NULL,
    "preceptorPersonaId" TEXT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningPath_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "learningPathId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "objective" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientSession" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "objective" TEXT,
    "description" TEXT,
    "estimatedMinutesMin" INTEGER,
    "estimatedMinutesMax" INTEGER,
    "goldThreshold" INTEGER NOT NULL DEFAULT 84,
    "silverThreshold" INTEGER NOT NULL DEFAULT 50,
    "bronzeThreshold" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "patientSessionId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "competencyArea" TEXT,
    "weightPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxPoints" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "rubricCriterionIds" JSONB,
    "requiredForCompletion" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "patientSessionId" TEXT NOT NULL,
    "conversationId" TEXT,
    "status" "SessionAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "scoredAt" TIMESTAMP(3),
    "sessionScore" DOUBLE PRECISION,
    "badgeTier" "BadgeTier",
    "passed" BOOLEAN,
    "clinicalScoreDetails" JSONB,

    CONSTRAINT "SessionAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AchievementResult" (
    "id" TEXT NOT NULL,
    "sessionAttemptId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "earnedPoints" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxPoints" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "percentScore" DOUBLE PRECISION,
    "weightedScore" DOUBLE PRECISION,
    "achieved" BOOLEAN NOT NULL DEFAULT false,
    "rubricCriterionIds" JSONB,
    "rubricCriteriaResults" JSONB,
    "evidence" JSONB,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AchievementResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionFeedback" (
    "id" TEXT NOT NULL,
    "sessionAttemptId" TEXT NOT NULL,
    "recognition" TEXT,
    "coaching" TEXT,
    "encouragement" TEXT,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BadgeAward" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "patientSessionId" TEXT NOT NULL,
    "sessionAttemptId" TEXT NOT NULL,
    "tier" "BadgeTier" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BadgeAward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XPEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionAttemptId" TEXT,
    "type" "XPEventType" NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XPEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Streak" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentCount" INTEGER NOT NULL DEFAULT 0,
    "longestCount" INTEGER NOT NULL DEFAULT 0,
    "lastActivityDate" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Streak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorAssessment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readinessLevel" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "strengths" JSONB,
    "growthAreas" JSONB,
    "recommendation" TEXT,
    "competencySnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MentorAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreceptorMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionAttemptId" TEXT,
    "type" "PreceptorMessageType" NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreceptorMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptionalProfessionalReadinessResult" (
    "id" TEXT NOT NULL,
    "sessionAttemptId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "environmentReviewEnabled" BOOLEAN NOT NULL DEFAULT false,
    "appearanceReviewEnabled" BOOLEAN NOT NULL DEFAULT false,
    "voiceAnalysisEnabled" BOOLEAN NOT NULL DEFAULT false,
    "environmentResult" JSONB,
    "appearanceResult" JSONB,
    "voiceResult" JSONB,
    "communicationResult" JSONB,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OptionalProfessionalReadinessResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PreceptorPersona_slug_key" ON "PreceptorPersona"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "LearningPath_slug_key" ON "LearningPath"("slug");

-- CreateIndex
CREATE INDEX "LearningPath_preceptorPersonaId_idx" ON "LearningPath"("preceptorPersonaId");

-- CreateIndex
CREATE INDEX "Unit_learningPathId_idx" ON "Unit"("learningPathId");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_learningPathId_slug_key" ON "Unit"("learningPathId", "slug");

-- CreateIndex
CREATE INDEX "PatientSession_caseId_idx" ON "PatientSession"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "PatientSession_unitId_slug_key" ON "PatientSession"("unitId", "slug");

-- CreateIndex
CREATE INDEX "Achievement_patientSessionId_idx" ON "Achievement"("patientSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_patientSessionId_slug_key" ON "Achievement"("patientSessionId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "SessionAttempt_conversationId_key" ON "SessionAttempt"("conversationId");

-- CreateIndex
CREATE INDEX "SessionAttempt_userId_idx" ON "SessionAttempt"("userId");

-- CreateIndex
CREATE INDEX "SessionAttempt_patientSessionId_idx" ON "SessionAttempt"("patientSessionId");

-- CreateIndex
CREATE INDEX "SessionAttempt_userId_patientSessionId_idx" ON "SessionAttempt"("userId", "patientSessionId");

-- CreateIndex
CREATE INDEX "AchievementResult_achievementId_idx" ON "AchievementResult"("achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "AchievementResult_sessionAttemptId_achievementId_key" ON "AchievementResult"("sessionAttemptId", "achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionFeedback_sessionAttemptId_key" ON "SessionFeedback"("sessionAttemptId");

-- CreateIndex
CREATE INDEX "BadgeAward_userId_idx" ON "BadgeAward"("userId");

-- CreateIndex
CREATE INDEX "BadgeAward_patientSessionId_idx" ON "BadgeAward"("patientSessionId");

-- CreateIndex
CREATE INDEX "BadgeAward_sessionAttemptId_idx" ON "BadgeAward"("sessionAttemptId");

-- CreateIndex
CREATE UNIQUE INDEX "BadgeAward_userId_patientSessionId_sessionAttemptId_key" ON "BadgeAward"("userId", "patientSessionId", "sessionAttemptId");

-- CreateIndex
CREATE INDEX "XPEvent_userId_idx" ON "XPEvent"("userId");

-- CreateIndex
CREATE INDEX "XPEvent_sessionAttemptId_idx" ON "XPEvent"("sessionAttemptId");

-- CreateIndex
CREATE UNIQUE INDEX "Streak_userId_key" ON "Streak"("userId");

-- CreateIndex
CREATE INDEX "MentorAssessment_userId_idx" ON "MentorAssessment"("userId");

-- CreateIndex
CREATE INDEX "PreceptorMessage_userId_idx" ON "PreceptorMessage"("userId");

-- CreateIndex
CREATE INDEX "PreceptorMessage_sessionAttemptId_idx" ON "PreceptorMessage"("sessionAttemptId");

-- CreateIndex
CREATE INDEX "OptionalProfessionalReadinessResult_userId_idx" ON "OptionalProfessionalReadinessResult"("userId");

-- CreateIndex
CREATE INDEX "OptionalProfessionalReadinessResult_sessionAttemptId_idx" ON "OptionalProfessionalReadinessResult"("sessionAttemptId");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_sessionAttemptId_key" ON "Submission"("sessionAttemptId");

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_sessionAttemptId_fkey" FOREIGN KEY ("sessionAttemptId") REFERENCES "SessionAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningPath" ADD CONSTRAINT "LearningPath_preceptorPersonaId_fkey" FOREIGN KEY ("preceptorPersonaId") REFERENCES "PreceptorPersona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_learningPathId_fkey" FOREIGN KEY ("learningPathId") REFERENCES "LearningPath"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientSession" ADD CONSTRAINT "PatientSession_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientSession" ADD CONSTRAINT "PatientSession_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_patientSessionId_fkey" FOREIGN KEY ("patientSessionId") REFERENCES "PatientSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionAttempt" ADD CONSTRAINT "SessionAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionAttempt" ADD CONSTRAINT "SessionAttempt_patientSessionId_fkey" FOREIGN KEY ("patientSessionId") REFERENCES "PatientSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionAttempt" ADD CONSTRAINT "SessionAttempt_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AchievementResult" ADD CONSTRAINT "AchievementResult_sessionAttemptId_fkey" FOREIGN KEY ("sessionAttemptId") REFERENCES "SessionAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AchievementResult" ADD CONSTRAINT "AchievementResult_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionFeedback" ADD CONSTRAINT "SessionFeedback_sessionAttemptId_fkey" FOREIGN KEY ("sessionAttemptId") REFERENCES "SessionAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadgeAward" ADD CONSTRAINT "BadgeAward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadgeAward" ADD CONSTRAINT "BadgeAward_patientSessionId_fkey" FOREIGN KEY ("patientSessionId") REFERENCES "PatientSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadgeAward" ADD CONSTRAINT "BadgeAward_sessionAttemptId_fkey" FOREIGN KEY ("sessionAttemptId") REFERENCES "SessionAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XPEvent" ADD CONSTRAINT "XPEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XPEvent" ADD CONSTRAINT "XPEvent_sessionAttemptId_fkey" FOREIGN KEY ("sessionAttemptId") REFERENCES "SessionAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Streak" ADD CONSTRAINT "Streak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorAssessment" ADD CONSTRAINT "MentorAssessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreceptorMessage" ADD CONSTRAINT "PreceptorMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreceptorMessage" ADD CONSTRAINT "PreceptorMessage_sessionAttemptId_fkey" FOREIGN KEY ("sessionAttemptId") REFERENCES "SessionAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionalProfessionalReadinessResult" ADD CONSTRAINT "OptionalProfessionalReadinessResult_sessionAttemptId_fkey" FOREIGN KEY ("sessionAttemptId") REFERENCES "SessionAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionalProfessionalReadinessResult" ADD CONSTRAINT "OptionalProfessionalReadinessResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
