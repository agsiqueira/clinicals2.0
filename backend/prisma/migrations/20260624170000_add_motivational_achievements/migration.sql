-- CreateTable
CREATE TABLE "MotivationalAchievement" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "icon" TEXT,
    "xpReward" INTEGER NOT NULL DEFAULT 0,
    "targetValue" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "criteria" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MotivationalAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMotivationalAchievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "motivationalAchievementId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'LOCKED',
    "currentValue" INTEGER NOT NULL DEFAULT 0,
    "targetValue" INTEGER,
    "earnedAt" TIMESTAMP(3),
    "lastEvaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMotivationalAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MotivationalAchievement_slug_key" ON "MotivationalAchievement"("slug");

-- CreateIndex
CREATE INDEX "UserMotivationalAchievement_userId_idx" ON "UserMotivationalAchievement"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserMotivationalAchievement_userId_motivationalAchievementId_key" ON "UserMotivationalAchievement"("userId", "motivationalAchievementId");

-- AddForeignKey
ALTER TABLE "UserMotivationalAchievement" ADD CONSTRAINT "UserMotivationalAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMotivationalAchievement" ADD CONSTRAINT "UserMotivationalAchievement_motivationalAchievementId_fkey" FOREIGN KEY ("motivationalAchievementId") REFERENCES "MotivationalAchievement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
