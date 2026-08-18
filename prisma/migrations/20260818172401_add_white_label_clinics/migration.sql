-- CreateEnum
CREATE TYPE "ClinicStatus" AS ENUM ('active', 'suspended');

-- CreateTable
CREATE TABLE "clinic_plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "stripePriceId" TEXT,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "interval" TEXT NOT NULL DEFAULT 'month',
    "seatLimit" INTEGER NOT NULL,
    "monthlyScanQuota" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinic_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinic_settings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "status" "ClinicStatus" NOT NULL DEFAULT 'active',
    "displayName" TEXT NOT NULL,
    "logoUrl" TEXT,
    "primaryColor" TEXT,
    "accentColor" TEXT,
    "supportEmail" TEXT,
    "planId" TEXT,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'none',
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "periodScanCount" INTEGER NOT NULL DEFAULT 0,
    "periodStartedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinic_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clinic_plan_stripePriceId_key" ON "clinic_plan"("stripePriceId");

-- CreateIndex
CREATE INDEX "clinic_plan_isActive_sortOrder_idx" ON "clinic_plan"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "clinic_settings_organizationId_key" ON "clinic_settings"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "clinic_settings_subdomain_key" ON "clinic_settings"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "clinic_settings_stripeCustomerId_key" ON "clinic_settings"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "clinic_settings_stripeSubscriptionId_key" ON "clinic_settings"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "clinic_settings_status_idx" ON "clinic_settings"("status");

-- AddForeignKey
ALTER TABLE "clinic_settings" ADD CONSTRAINT "clinic_settings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_settings" ADD CONSTRAINT "clinic_settings_planId_fkey" FOREIGN KEY ("planId") REFERENCES "clinic_plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
