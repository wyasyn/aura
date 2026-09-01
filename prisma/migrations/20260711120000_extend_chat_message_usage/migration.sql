-- AlterTable
ALTER TABLE "chat_message" ADD COLUMN "cachedTokens" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "chat_message" ADD COLUMN "reasoningTokens" INTEGER;
ALTER TABLE "chat_message" ADD COLUMN "modelId" TEXT;
ALTER TABLE "chat_message" ADD COLUMN "estimatedCostMicros" INTEGER;
ALTER TABLE "chat_message" ADD COLUMN "metadata" JSONB;

-- CreateIndex
CREATE INDEX "chat_message_modelId_idx" ON "chat_message"("modelId");
CREATE INDEX "chat_message_createdAt_idx" ON "chat_message"("createdAt");
