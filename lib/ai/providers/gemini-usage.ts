import type { UsageInput } from "@/lib/scans/cost"

export type GeminiUsageMetadata = {
  promptTokenCount?: number
  candidatesTokenCount?: number
  thoughtsTokenCount?: number
  cachedContentTokenCount?: number
  totalTokenCount?: number
  responseTokenCount?: number
}

export type MappedGeminiUsage = UsageInput & {
  reasoningTokens: number
  totalTokens: number
  rawUsage: GeminiUsageMetadata | null
}

/**
 * Adds two usage records for the same model. Used when a single logical
 * operation costs more than one model call (for example a validation repair
 * retry), so billing and the usage log see the true total.
 */
export function sumGeminiUsage(
  first: MappedGeminiUsage,
  second: MappedGeminiUsage,
): MappedGeminiUsage {
  return {
    provider: first.provider,
    modelId: first.modelId,
    inputTokens: first.inputTokens + second.inputTokens,
    outputTokens: first.outputTokens + second.outputTokens,
    cachedTokens: (first.cachedTokens ?? 0) + (second.cachedTokens ?? 0),
    reasoningTokens: first.reasoningTokens + second.reasoningTokens,
    totalTokens: first.totalTokens + second.totalTokens,
    rawUsage: second.rawUsage ?? first.rawUsage,
  }
}

export function mapGeminiUsageMetadata(
  provider: UsageInput["provider"],
  modelId: string,
  usageMetadata: GeminiUsageMetadata | undefined | null,
): MappedGeminiUsage {
  if (!usageMetadata) {
    return {
      provider,
      modelId,
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      reasoningTokens: 0,
      totalTokens: 0,
      rawUsage: null,
    }
  }

  const cachedTokens = usageMetadata.cachedContentTokenCount ?? 0
  const promptTokens = usageMetadata.promptTokenCount ?? 0
  const inputTokens = Math.max(0, promptTokens - cachedTokens)
  const candidates =
    usageMetadata.candidatesTokenCount ?? usageMetadata.responseTokenCount ?? 0
  const reasoningTokens = usageMetadata.thoughtsTokenCount ?? 0
  const outputTokens = candidates + reasoningTokens

  const fallbackTotal = inputTokens + outputTokens + cachedTokens
  const totalTokens = usageMetadata.totalTokenCount ?? fallbackTotal

  return {
    provider,
    modelId,
    inputTokens,
    outputTokens,
    cachedTokens,
    reasoningTokens,
    totalTokens,
    rawUsage: usageMetadata,
  }
}
