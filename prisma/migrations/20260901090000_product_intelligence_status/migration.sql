-- Extraction lifecycle status for products.
--
-- Additive only. No column is dropped and no row is deleted.

-- CreateEnum
CREATE TYPE "ProductIntelligenceStatus" AS ENUM ('pending', 'extracting', 'extracted', 'needs_review', 'failed');

-- AlterTable
ALTER TABLE "product"
  ADD COLUMN "intelligenceStatus"      "ProductIntelligenceStatus" NOT NULL DEFAULT 'pending',
  ADD COLUMN "intelligenceError"       TEXT,
  ADD COLUMN "intelligenceExtractedAt" TIMESTAMP(3);

-- Backfill the lifecycle for products that predate this column.
--
-- The default is `pending`, which is right for a product nothing has assessed
-- and wrong for the ones already carrying extracted intelligence. A primary
-- classification is only ever written by the extraction pass or by an
-- administrator in the editor, so its presence is the evidence that something
-- has run. Products whose source has since changed stay `pending`: their
-- intelligence was derived from text that has moved on, which is exactly what
-- awaiting re-extraction means.
UPDATE "product"
SET "intelligenceStatus" = 'extracted'
WHERE "primaryClassification" IS NOT NULL
  AND "intelligenceStale" = false;

-- Extracted, but not carrying enough for the engine to rely on. Mirrors the
-- 60% threshold the application already treats as confidently recommendable.
UPDATE "product"
SET "intelligenceStatus" = 'needs_review'
WHERE "primaryClassification" IS NOT NULL
  AND "intelligenceStale" = false
  AND "completenessScore" < 60;

-- CreateIndex
CREATE INDEX "product_intelligenceStatus_idx" ON "product"("intelligenceStatus");
