-- Durable queue for product-intelligence work.
--
-- Additive only. No column is dropped and no row is deleted.

-- CreateEnum
CREATE TYPE "ProductJobKind" AS ENUM ('intelligence_extraction', 'catalogue_sync');

-- CreateEnum
CREATE TYPE "ProductJobStatus" AS ENUM ('queued', 'running', 'succeeded', 'failed', 'cancelled');

-- CreateTable
CREATE TABLE "product_job" (
    "id" TEXT NOT NULL,
    "kind" "ProductJobKind" NOT NULL,
    "status" "ProductJobStatus" NOT NULL DEFAULT 'queued',
    "productId" TEXT,
    "organizationId" TEXT,
    "batchId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "runAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "error" TEXT,
    "result" JSONB,
    "force" BOOLEAN NOT NULL DEFAULT false,
    "requestedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_job_status_runAfter_idx" ON "product_job"("status", "runAfter");

-- CreateIndex
CREATE INDEX "product_job_batchId_idx" ON "product_job"("batchId");

-- CreateIndex
CREATE INDEX "product_job_organizationId_idx" ON "product_job"("organizationId");

-- CreateIndex
CREATE INDEX "product_job_productId_idx" ON "product_job"("productId");

-- One outstanding job per product per kind.
--
-- A partial unique index rather than an application check: two administrators
-- clicking at the same moment, or a page submitted twice, both reach the
-- database, and only the database can settle which one wins. Restricted to
-- unfinished work so a product can be re-extracted as often as anyone likes —
-- just never twice at once.
CREATE UNIQUE INDEX "product_job_outstanding_key"
    ON "product_job"("kind", "productId")
    WHERE "status" IN ('queued', 'running') AND "productId" IS NOT NULL;
