-- CreateEnum
CREATE TYPE "TrainingRecordStatus" AS ENUM ('pending_validation', 'validated', 'rejected', 'withdrawn');

-- CreateEnum
CREATE TYPE "TrainingVerdict" AS ENUM ('confirmed', 'corrected', 'rejected');

-- AlterTable
ALTER TABLE "clinic_settings" ADD COLUMN     "allowTrainingContribution" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trainingContributionSetAt" TIMESTAMP(3),
ADD COLUMN     "trainingContributionSetById" TEXT;

-- AlterTable
ALTER TABLE "user_profile" ADD COLUMN     "trainingConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trainingConsentAt" TIMESTAMP(3),
ADD COLUMN     "trainingConsentVersion" TEXT;

-- CreateTable
CREATE TABLE "training_record" (
    "id" TEXT NOT NULL,
    "sourceScanId" TEXT NOT NULL,
    "sourceUserId" TEXT NOT NULL,
    "organizationId" TEXT,
    "status" "TrainingRecordStatus" NOT NULL DEFAULT 'pending_validation',
    "payload" JSONB NOT NULL,
    "deidentVersion" TEXT NOT NULL,
    "deidentifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt" TIMESTAMP(3),
    "withdrawnReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_validation" (
    "id" TEXT NOT NULL,
    "trainingRecordId" TEXT NOT NULL,
    "expertId" TEXT NOT NULL,
    "verdict" "TrainingVerdict" NOT NULL,
    "correctedBand" "AssessmentBand",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_validation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" TEXT,
    "action" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT,
    "organizationId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "training_record_sourceScanId_key" ON "training_record"("sourceScanId");

-- CreateIndex
CREATE INDEX "training_record_status_idx" ON "training_record"("status");

-- CreateIndex
CREATE INDEX "training_record_sourceUserId_idx" ON "training_record"("sourceUserId");

-- CreateIndex
CREATE INDEX "training_record_organizationId_idx" ON "training_record"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "training_validation_trainingRecordId_key" ON "training_validation"("trainingRecordId");

-- CreateIndex
CREATE INDEX "training_validation_expertId_idx" ON "training_validation"("expertId");

-- CreateIndex
CREATE INDEX "audit_log_action_createdAt_idx" ON "audit_log"("action", "createdAt");

-- CreateIndex
CREATE INDEX "audit_log_subjectType_subjectId_idx" ON "audit_log"("subjectType", "subjectId");

-- CreateIndex
CREATE INDEX "audit_log_organizationId_createdAt_idx" ON "audit_log"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "training_record" ADD CONSTRAINT "training_record_sourceScanId_fkey" FOREIGN KEY ("sourceScanId") REFERENCES "scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_record" ADD CONSTRAINT "training_record_sourceUserId_fkey" FOREIGN KEY ("sourceUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_record" ADD CONSTRAINT "training_record_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_validation" ADD CONSTRAINT "training_validation_trainingRecordId_fkey" FOREIGN KEY ("trainingRecordId") REFERENCES "training_record"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_validation" ADD CONSTRAINT "training_validation_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "expert_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
