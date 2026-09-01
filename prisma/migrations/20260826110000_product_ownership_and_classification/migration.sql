-- CreateEnum
CREATE TYPE "ProductClassification" AS ENUM ('organic', 'natural', 'synthetic', 'dermatological', 'ayurvedic', 'clinical', 'other');

-- DropIndex
DROP INDEX "product_sku_key";

-- DropIndex
DROP INDEX "product_slug_key";

-- AlterTable
ALTER TABLE "product" ADD COLUMN     "classifications" "ProductClassification"[] DEFAULT ARRAY[]::"ProductClassification"[],
ADD COLUMN     "isRecommendable" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "product_organizationId_isActive_isRecommendable_idx" ON "product"("organizationId", "isActive", "isRecommendable");

-- CreateIndex
CREATE UNIQUE INDEX "product_organizationId_sku_key" ON "product"("organizationId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "product_organizationId_slug_key" ON "product"("organizationId", "slug");

-- Aurora products keep global uniqueness.
--
-- The composite constraints above scope sku and slug to their owner, which is
-- what lets two clinics both sell "vitamin-c-serum". They do not constrain
-- Aurora products against each other: organizationId is NULL for those, and
-- Postgres treats NULLs as distinct, so ("NULL", 'x') never collides with
-- ("NULL", 'x'). These partial indexes close that gap for global rows only.
CREATE UNIQUE INDEX "product_global_sku_key"
  ON "product"("sku") WHERE "organizationId" IS NULL;

CREATE UNIQUE INDEX "product_global_slug_key"
  ON "product"("slug") WHERE "organizationId" IS NULL;
