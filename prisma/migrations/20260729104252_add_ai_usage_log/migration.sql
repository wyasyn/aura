-- CreateEnum
CREATE TYPE "AiUsageFeature" AS ENUM ('scan_analyze', 'scan_live', 'chat_reply', 'chat_guardrail', 'transcribe');

-- CreateTable
CREATE TABLE "ai_usage" (
    "id" TEXT NOT NULL,
    "feature" "AiUsageFeature" NOT NULL,
    "provider" "AiProvider" NOT NULL,
    "modelId" TEXT NOT NULL,
    "userId" TEXT,
    "scanId" TEXT,
    "conversationId" TEXT,
    "chatMessageId" TEXT,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "cachedTokens" INTEGER NOT NULL DEFAULT 0,
    "reasoningTokens" INTEGER,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostMicros" INTEGER,
    "marginMicros" INTEGER,
    "latencyMs" INTEGER,
    "rawUsage" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_usage_chatMessageId_key" ON "ai_usage"("chatMessageId");

-- CreateIndex
CREATE INDEX "ai_usage_createdAt_idx" ON "ai_usage"("createdAt");

-- CreateIndex
CREATE INDEX "ai_usage_feature_createdAt_idx" ON "ai_usage"("feature", "createdAt");

-- CreateIndex
CREATE INDEX "ai_usage_modelId_createdAt_idx" ON "ai_usage"("modelId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_usage_userId_createdAt_idx" ON "ai_usage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_usage_scanId_idx" ON "ai_usage"("scanId");

-- CreateIndex
CREATE INDEX "scan_ledger_createdAt_idx" ON "scan_ledger"("createdAt");

-- CreateIndex
CREATE INDEX "scan_usage_createdAt_idx" ON "scan_usage"("createdAt");

-- CreateIndex
CREATE INDEX "scan_usage_modelId_idx" ON "scan_usage"("modelId");
