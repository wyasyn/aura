import type { Prisma, ScanLedgerReason, ScanTier } from "@/generated/prisma/client"

import { prisma } from "@/lib/db/client"
import { getUserScanTier } from "@/lib/models/queries"
import {
  AVG_CHAT_TOKENS_PER_MESSAGE,
  CHAT_MESSAGE_TOKEN_ESTIMATE,
  getChatTokensPerScanForTier,
} from "@/lib/scans/constants"

export type TokenBudgetSnapshot = {
  tokenBudgetRemaining: bigint
  estimatedMessagesRemaining: number
}

export async function getTokenBudget(
  userId: string,
): Promise<TokenBudgetSnapshot> {
  let balance = await prisma.scanBalance.findUnique({
    where: { userId },
    select: {
      tokenBudgetRemaining: true,
      remaining: true,
    },
  })

  if (
    balance &&
    balance.remaining > 0 &&
    balance.tokenBudgetRemaining === BigInt(0)
  ) {
    const tier = await getUserScanTier(userId)
    const grant = chatTokensForScanGrant(balance.remaining, tier)
    balance = await prisma.scanBalance.update({
      where: { userId },
      data: { tokenBudgetRemaining: grant },
      select: {
        tokenBudgetRemaining: true,
        remaining: true,
      },
    })
  }

  const remaining = balance?.tokenBudgetRemaining ?? BigInt(0)
  const estimatedMessagesRemaining = Math.floor(
    Number(remaining) / AVG_CHAT_TOKENS_PER_MESSAGE,
  )
  return { tokenBudgetRemaining: remaining, estimatedMessagesRemaining }
}

export function chatTokensForScanGrant(
  amount: number,
  tier: ScanTier,
): bigint {
  const perScan = getChatTokensPerScanForTier(tier)
  return BigInt(amount * perScan)
}

export async function hasSufficientTokenBudget(userId: string): Promise<boolean> {
  const { tokenBudgetRemaining } = await getTokenBudget(userId)
  return tokenBudgetRemaining >= BigInt(CHAT_MESSAGE_TOKEN_ESTIMATE)
}

type DebitChatTokensInput = {
  userId: string
  tokens: number
  conversationId: string
  scanId?: string
  metadata?: Prisma.InputJsonValue
}

async function resolveTier(userId: string): Promise<ScanTier> {
  return getUserScanTier(userId)
}

export async function debitChatTokens(input: DebitChatTokensInput) {
  if (input.tokens <= 0) {
    return
  }

  const tier = await resolveTier(input.userId)
  const debitAmount = BigInt(input.tokens)

  return prisma.$transaction(async (tx) => {
    const balance = await tx.scanBalance.findUnique({
      where: { userId: input.userId },
    })

    if (!balance || balance.tokenBudgetRemaining < debitAmount) {
      throw new Error("Insufficient chat token budget")
    }

    const updated = await tx.scanBalance.update({
      where: { userId: input.userId },
      data: {
        tokenBudgetRemaining: { decrement: debitAmount },
        lifetimeTokensUsed: { increment: debitAmount },
      },
    })

    await tx.scanLedger.create({
      data: {
        userId: input.userId,
        delta: 0,
        reason: "chat_token_debit" satisfies ScanLedgerReason,
        tier,
        scanId: input.scanId,
        metadata: {
          conversationId: input.conversationId,
          tokensDebited: input.tokens,
          ...(input.metadata && typeof input.metadata === "object"
            ? input.metadata
            : {}),
        },
      },
    })

    return updated
  })
}
