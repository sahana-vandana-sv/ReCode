-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "Rating" AS ENUM ('EASY', 'OKAY', 'FORGOT');

-- CreateEnum
CREATE TYPE "ProblemSource" AS ENUM ('MANUAL', 'SYNC');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "leetcodeUsername" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Problem" (
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "titleSlug" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "topicTags" TEXT[],
    "paidOnly" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Problem_pkey" PRIMARY KEY ("number")
);

-- CreateTable
CREATE TABLE "UserProblem" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "problemNumber" INTEGER NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "customTags" TEXT[],
    "source" "ProblemSource" NOT NULL DEFAULT 'MANUAL',
    "solvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stage" INTEGER NOT NULL DEFAULT 0,
    "nextReviewAt" TIMESTAMP(3) NOT NULL,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "lastReviewedAt" TIMESTAMP(3),
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProblem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "userProblemId" TEXT NOT NULL,
    "rating" "Rating" NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stageBefore" INTEGER NOT NULL,
    "stageAfter" INTEGER NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Problem_titleSlug_key" ON "Problem"("titleSlug");

-- CreateIndex
CREATE INDEX "UserProblem_userId_nextReviewAt_idx" ON "UserProblem"("userId", "nextReviewAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserProblem_userId_problemNumber_key" ON "UserProblem"("userId", "problemNumber");

-- CreateIndex
CREATE INDEX "Review_userProblemId_idx" ON "Review"("userProblemId");

-- AddForeignKey
ALTER TABLE "UserProblem" ADD CONSTRAINT "UserProblem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProblem" ADD CONSTRAINT "UserProblem_problemNumber_fkey" FOREIGN KEY ("problemNumber") REFERENCES "Problem"("number") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userProblemId_fkey" FOREIGN KEY ("userProblemId") REFERENCES "UserProblem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Supabase exposes tables in `public` through its REST API. ReCode reads and
-- writes only through Prisma, so turn on RLS with no policies to close that API.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Problem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserProblem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Review" ENABLE ROW LEVEL SECURITY;