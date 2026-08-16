-- AlterTable
ALTER TABLE "ai_model_rate" ADD COLUMN "isScanDefault" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ai_model_rate" ADD COLUMN "supportsVision" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "ai_model_rate_isScanDefault_idx" ON "ai_model_rate"("isScanDefault");
