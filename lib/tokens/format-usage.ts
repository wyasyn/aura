export type TokenUsageBreakdown = {
  inputTokens: number
  outputTokens: number
  cachedTokens?: number
  reasoningTokens?: number
  totalTokens?: number
}

export function getUsageTotalTokens(usage: TokenUsageBreakdown): number {
  return (
    usage.totalTokens ??
    usage.inputTokens + usage.outputTokens + (usage.cachedTokens ?? 0)
  )
}

export function formatTokenBreakdown(usage: TokenUsageBreakdown): string {
  const parts = [
    `${usage.inputTokens.toLocaleString()} in`,
    `${usage.outputTokens.toLocaleString()} out`,
  ]

  if ((usage.cachedTokens ?? 0) > 0) {
    parts.push(`${usage.cachedTokens!.toLocaleString()} cached`)
  }

  if ((usage.reasoningTokens ?? 0) > 0) {
    parts.push(`${usage.reasoningTokens!.toLocaleString()} reasoning`)
  }

  return parts.join(" / ")
}

export function formatTokenBreakdownWithTotal(usage: TokenUsageBreakdown): string {
  const total = getUsageTotalTokens(usage)
  return `${formatTokenBreakdown(usage)} (${total.toLocaleString()} total)`
}
