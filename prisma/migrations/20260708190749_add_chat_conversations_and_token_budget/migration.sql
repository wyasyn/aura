-- CreateEnum
CREATE TYPE "ChatConversationKind" AS ENUM ('advice', 'follow_up');

-- CreateEnum
CREATE TYPE "ChatMessageRole" AS ENUM ('user', 'assistant', 'system_refusal');

-- AlterEnum
ALTER TYPE "ScanLedgerReason" ADD VALUE 'chat_token_debit';

-- AlterTable
ALTER TABLE "scan_balance" ADD COLUMN     "lifetimeTokensUsed" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "tokenBudgetRemaining" BIGINT NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "chat_conversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scanId" TEXT,
    "kind" "ChatConversationKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "ChatMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_conversation_userId_idx" ON "chat_conversation"("userId");

-- CreateIndex
CREATE INDEX "chat_conversation_scanId_idx" ON "chat_conversation"("scanId");

-- CreateIndex
CREATE INDEX "chat_conversation_userId_kind_idx" ON "chat_conversation"("userId", "kind");

-- CreateIndex
CREATE INDEX "chat_message_conversationId_idx" ON "chat_message"("conversationId");

-- CreateIndex
CREATE INDEX "chat_message_conversationId_createdAt_idx" ON "chat_message"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "chat_conversation" ADD CONSTRAINT "chat_conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_conversation" ADD CONSTRAINT "chat_conversation_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "chat_conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
