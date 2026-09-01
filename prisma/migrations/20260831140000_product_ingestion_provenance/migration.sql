-- Product provenance and catalogue synchronisation history.
--
-- Additive only. No column is dropped and no row is deleted: historical
-- recommendations reference products by slug and must keep resolving.

-- CreateEnum
CREATE TYPE "ProductSource" AS ENUM ('woocommerce', 'manual', 'fallback');

-- CreateEnum
CREATE TYPE "ProductSyncStatus" AS ENUM ('running', 'succeeded', 'failed');

-- AlterTable
ALTER TABLE "product"
  ADD COLUMN "source"            "ProductSource" NOT NULL DEFAULT 'manual',
  ADD COLUMN "externalId"        TEXT,
  ADD COLUMN "sourceUpdatedAt"   TIMESTAMP(3),
  ADD COLUMN "lastSyncedAt"      TIMESTAMP(3),
  ADD COLUMN "sourceHash"        TEXT,
  ADD COLUMN "intelligenceStale" BOOLEAN NOT NULL DEFAULT false;

-- Backfill provenance for products that predate these columns.
--
-- The column default is `manual`, which is right for a product an administrator
-- typed in but wrong for every row already here. Three cases, in order of how
-- specific the evidence is:

-- 1. A SKU shaped WOO-<id> was written by the WooCommerce mapper, and the id in
--    it is the external identifier that was previously only encoded in a string.
UPDATE "product"
SET "source" = 'woocommerce',
    "externalId" = substring("sku" from 5)
WHERE "sku" ~ '^WOO-[0-9]+$';

-- 2. Aurora-owned products that did not come from the store were seeded from
--    scripts/data/products_fallback.json. Recording them as `manual` would claim
--    somebody entered them by hand; `fallback` says what actually happened, and
--    makes it visible that they carry no external id to re-sync against.
UPDATE "product"
SET "source" = 'fallback'
WHERE "organizationId" IS NULL
  AND "sku" !~ '^WOO-[0-9]+$';

-- 3. A clinic's own product was created through the clinic editor by a person,
--    which is exactly what `manual` means. Left at the column default.

-- CreateIndex
-- Postgres treats NULLs as distinct, so manual and fallback products — which
-- have no external id — never collide with each other under this.
CREATE UNIQUE INDEX "product_source_externalId_key" ON "product"("source", "externalId");

-- CreateTable
CREATE TABLE "product_sync_run" (
    "id" TEXT NOT NULL,
    "source" "ProductSource" NOT NULL,
    "status" "ProductSyncStatus" NOT NULL DEFAULT 'running',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "discovered" INTEGER NOT NULL DEFAULT 0,
    "created" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "unchanged" INTEGER NOT NULL DEFAULT 0,
    "archived" INTEGER NOT NULL DEFAULT 0,
    "markedStale" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "actorId" TEXT,

    CONSTRAINT "product_sync_run_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_sync_run_startedAt_idx" ON "product_sync_run"("startedAt");

-- CreateIndex
CREATE INDEX "product_sync_run_status_idx" ON "product_sync_run"("status");
