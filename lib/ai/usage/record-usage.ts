import type { AiUsageFeature, Prisma } from "@/generated/prisma/client"

import { prisma } from "@/lib/db/client"
import { estimateScanProviderCost, type UsageInput } from "@/lib/scans/cost"
import { getUsageTotalTokens } from "@/lib/tokens/format-usage"

export type RecordAiUsageInput = {
  feature: AiUsageFeature
  usage: UsageInput
  userId?: string | null
  scanId?: string | null
  conversationId?: string | null
  chatMessageId?: string | null
  latencyMs?: number | null
  /** Pass through a cost already computed by the caller to skip a rate lookup. */
  costMicros?: number | null
  marginMicros?: number | null
}

/**
 * Append one row to the AI usage log. Analytics reads this table exclusively,
 * so every provider call should land here. Never throws: a logging failure must
 * not fail the user's request.
 */
export async function recordAiUsage(input: RecordAiUsageInput): Promise<void> {
  try {
    const { usage } = input
    let costMicros = input.costMicros ?? null
    let marginMicros = input.marginMicros ?? null

    if (costMicros === null) {
      const estimate = await estimateScanProviderCost(usage)
      costMicros = estimate?.costMicros ?? null
      marginMicros = estimate?.marginMicros ?? null
    }

    await prisma.aiUsage.create({
      data: {
        feature: input.feature,
        provider: usage.provider,
        modelId: usage.modelId,
        userId: input.userId ?? null,
        scanId: input.scanId ?? null,
        conversationId: input.conversationId ?? null,
        chatMessageId: input.chatMessageId ?? null,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cachedTokens: usage.cachedTokens ?? 0,
        reasoningTokens: usage.reasoningTokens ?? null,
        totalTokens: getUsageTotalTokens(usage),
        estimatedCostMicros: costMicros,
        marginMicros,
        latencyMs: input.latencyMs ?? null,
        rawUsage: (usage.rawUsage ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
      },
    })
  } catch (error) {
    console.error("Failed to record AI usage", error)
  }
}
