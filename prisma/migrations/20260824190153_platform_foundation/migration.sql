-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('active', 'invited', 'suspended', 'revoked');

-- CreateEnum
CREATE TYPE "AuditResult" AS ENUM ('success', 'denied', 'failure');

-- AlterTable
ALTER TABLE "audit_log" ADD COLUMN     "requestId" TEXT,
ADD COLUMN     "result" "AuditResult" NOT NULL DEFAULT 'success';

-- AlterTable
ALTER TABLE "booking" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "member" ADD COLUMN     "status" "MembershipStatus" NOT NULL DEFAULT 'active';

-- CreateIndex
CREATE INDEX "booking_organizationId_createdAt_idx" ON "booking"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "member_userId_status_idx" ON "member"("userId", "status");

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
