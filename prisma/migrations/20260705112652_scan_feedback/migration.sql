-- CreateTable
CREATE TABLE "scan_feedback" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scan_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scan_feedback_scanId_key" ON "scan_feedback"("scanId");

-- CreateIndex
CREATE INDEX "scan_feedback_userId_idx" ON "scan_feedback"("userId");

-- CreateIndex
CREATE INDEX "scan_feedback_createdAt_idx" ON "scan_feedback"("createdAt");

-- AddForeignKey
ALTER TABLE "scan_feedback" ADD CONSTRAINT "scan_feedback_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_feedback" ADD CONSTRAINT "scan_feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
