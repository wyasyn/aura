-- CreateEnum
CREATE TYPE "ScanTier" AS ENUM ('start', 'regular', 'pro');

-- CreateEnum
CREATE TYPE "ScanCaptureMode" AS ENUM ('still', 'live');

-- AlterTable
ALTER TABLE "user" ADD COLUMN "scanTier" "ScanTier" NOT NULL DEFAULT 'start';

-- AlterTable
ALTER TABLE "scan" ADD COLUMN "captureMode" "ScanCaptureMode" NOT NULL DEFAULT 'still';

-- AlterTable
ALTER TABLE "ai_model_rate" ADD COLUMN "supportsLive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ai_model_rate" ADD COLUMN "assignedTier" "ScanTier";
ALTER TABLE "ai_model_rate" ADD COLUMN "thinkingLevel" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ai_model_rate_assignedTier_key" ON "ai_model_rate"("assignedTier");

-- Migrate existing default model to start tier
UPDATE "ai_model_rate" SET "assignedTier" = 'start' WHERE "isScanDefault" = true;
