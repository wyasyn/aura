-- CreateEnum
CREATE TYPE "RecommendationOrigin" AS ENUM ('engine', 'model_gap_fill');

-- CreateEnum
CREATE TYPE "GapFillReason" AS ENUM ('below_minimum', 'no_safe_candidates', 'no_relevant_candidates');

-- CreateEnum
CREATE TYPE "RecommendationVerdict" AS ENUM ('helpful', 'not_relevant', 'already_use', 'did_not_suit');

-- AlterTable
ALTER TABLE "clinic_settings" ADD COLUMN     "recommendationWeights" JSONB;

-- CreateTable
CREATE TABLE "scan_recommendation" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "productSlug" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "origin" "RecommendationOrigin" NOT NULL DEFAULT 'engine',
    "gapFillReason" "GapFillReason",
    "score" DOUBLE PRECISION,
    "rawScore" DOUBLE PRECISION,
    "components" JSONB,
    "addresses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "citedActives" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "weights" JSONB,
    "weightsVersion" TEXT,
    "source" TEXT NOT NULL DEFAULT 'aurora',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scan_recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scan_recommendation_run" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "candidateCount" INTEGER NOT NULL DEFAULT 0,
    "exclusions" JSONB,
    "engineCount" INTEGER NOT NULL DEFAULT 0,
    "gapFillCount" INTEGER NOT NULL DEFAULT 0,
    "gapFillReason" "GapFillReason",
    "confident" BOOLEAN NOT NULL DEFAULT false,
    "weightsVersion" TEXT,
    "usedClinicWeights" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scan_recommendation_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_feedback" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "verdict" "RecommendationVerdict" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendation_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scan_recommendation_productSlug_idx" ON "scan_recommendation"("productSlug");

-- CreateIndex
CREATE INDEX "scan_recommendation_origin_idx" ON "scan_recommendation"("origin");

-- CreateIndex
CREATE INDEX "scan_recommendation_createdAt_idx" ON "scan_recommendation"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "scan_recommendation_scanId_rank_key" ON "scan_recommendation"("scanId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "scan_recommendation_scanId_productSlug_key" ON "scan_recommendation"("scanId", "productSlug");

-- CreateIndex
CREATE UNIQUE INDEX "scan_recommendation_run_scanId_key" ON "scan_recommendation_run"("scanId");

-- CreateIndex
CREATE INDEX "scan_recommendation_run_createdAt_idx" ON "scan_recommendation_run"("createdAt");

-- CreateIndex
CREATE INDEX "scan_recommendation_run_confident_idx" ON "scan_recommendation_run"("confident");

-- CreateIndex
CREATE UNIQUE INDEX "recommendation_feedback_recommendationId_key" ON "recommendation_feedback"("recommendationId");

-- CreateIndex
CREATE INDEX "recommendation_feedback_userId_idx" ON "recommendation_feedback"("userId");

-- CreateIndex
CREATE INDEX "recommendation_feedback_verdict_idx" ON "recommendation_feedback"("verdict");

-- CreateIndex
CREATE INDEX "recommendation_feedback_createdAt_idx" ON "recommendation_feedback"("createdAt");

-- AddForeignKey
ALTER TABLE "scan_recommendation" ADD CONSTRAINT "scan_recommendation_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_recommendation_run" ADD CONSTRAINT "scan_recommendation_run_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_feedback" ADD CONSTRAINT "recommendation_feedback_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "scan_recommendation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_feedback" ADD CONSTRAINT "recommendation_feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
