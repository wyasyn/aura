import type { GeminiUsageMetadata } from "@/lib/ai/providers/gemini-usage"
import type { AiProvider } from "@/generated/prisma/client"

import { prisma } from "@/lib/db/client"
import { getPricingMarginBps } from "@/lib/scans/constants"

export type UsageInput = {
  provider: AiProvider
  modelId: string
  inputTokens: number
  outputTokens: number
  cachedTokens?: number
  reasoningTokens?: number
  totalTokens?: number
  rawUsage?: GeminiUsageMetadata | null
}

export type CostBreakdown = {
  inputMicros: number
  outputMicros: number
  cachedMicros: number
}

export type CostEstimate = {
  costMicros: number
  marginMicros: number
  breakdown: CostBreakdown
}

function hasMeteredUsage(usage: UsageInput): boolean {
  return (
    usage.inputTokens > 0 ||
    usage.outputTokens > 0 ||
    (usage.cachedTokens ?? 0) > 0
  )
}

function computeCostMicros(
  usage: UsageInput,
  rate: {
    inputMicrosPer1M: number
    outputMicrosPer1M: number
    cachedInputMicrosPer1M: number
  },
): CostBreakdown {
  const inputMicros = Math.ceil(
    (usage.inputTokens * rate.inputMicrosPer1M) / 1_000_000,
  )
  const outputMicros = Math.ceil(
    (usage.outputTokens * rate.outputMicrosPer1M) / 1_000_000,
  )
  const cachedMicros = Math.ceil(
    ((usage.cachedTokens ?? 0) * rate.cachedInputMicrosPer1M) / 1_000_000,
  )

  return { inputMicros, outputMicros, cachedMicros }
}

export async function estimateScanProviderCost(
  usage: UsageInput,
): Promise<CostEstimate | null> {
  if (!hasMeteredUsage(usage)) {
    return null
  }

  const rate = await prisma.aiModelRate.findFirst({
    where: {
      provider: usage.provider,
      modelId: usage.modelId,
      isActive: true,
    },
  })

  if (!rate) {
    return null
  }

  const breakdown = computeCostMicros(usage, rate)
  const costMicros =
    breakdown.inputMicros + breakdown.outputMicros + breakdown.cachedMicros
  const marginBps = getPricingMarginBps()
  const marginMicros = Math.ceil((costMicros * marginBps) / 10_000)

  return { costMicros, marginMicros, breakdown }
}
