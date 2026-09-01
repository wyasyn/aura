/**
 * Primitives shared by the admin usage aggregates and the unit-economics
 * derivations. Both read the same `ai_usage` window, so filter translation and
 * token-breakdown arithmetic live here rather than being duplicated (or forming
 * an import cycle between the two modules).
 */

import { Prisma, type AiUsageFeature } from "@/generated/prisma/client"
import { getPeriodStart, type UsagePeriod } from "@/lib/admin/periods"

/** Filter values exposed in the UI, mapped to the features they cover. */
export type UsageSource = "all" | "scan" | "chat" | "guardrail" | "transcribe"

export const SOURCE_FEATURES: Record<UsageSource, AiUsageFeature[] | null> = {
  all: null,
  scan: ["scan_analyze", "scan_live"],
  chat: ["chat_reply", "chat_recommendations"],
  guardrail: ["chat_guardrail"],
  transcribe: ["transcribe"],
}

export const SCAN_FEATURES = new Set<AiUsageFeature>([
  "scan_analyze",
  "scan_live",
])

/**
 * Everything a scan credit entitles beyond the scan itself. Guardrail and
 * transcription calls have no user-visible output of their own but are billed,
 * so they belong in the loaded cost of a chat turn.
 */
export const CHAT_FEATURES = new Set<AiUsageFeature>([
  "chat_reply",
  "chat_recommendations",
  "chat_guardrail",
  "transcribe",
])

export type UsageFilters = {
  period?: UsagePeriod
  modelId?: string
  source?: UsageSource
}

export type ResolvedUsageFilters = Required<UsageFilters>

export function resolveFilters(input: UsageFilters): ResolvedUsageFilters {
  return {
    period: input.period ?? "30d",
    modelId: input.modelId ?? "",
    source: input.source ?? "all",
  }
}

export type TokenBreakdown = {
  inputTokens: number
  outputTokens: number
  cachedTokens: number
  reasoningTokens: number
  totalTokens: number
  estimatedCostMicros: number
}

type SumFields = {
  inputTokens: number | null
  outputTokens: number | null
  cachedTokens: number | null
  reasoningTokens: number | null
  totalTokens: number | null
  estimatedCostMicros: number | null
}

export const SUM_SELECT = {
  inputTokens: true,
  outputTokens: true,
  cachedTokens: true,
  reasoningTokens: true,
  totalTokens: true,
  estimatedCostMicros: true,
} as const

export function emptyBreakdown(): TokenBreakdown {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cachedTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0,
    estimatedCostMicros: 0,
  }
}

export function toBreakdown(sum: SumFields | null | undefined): TokenBreakdown {
  return {
    inputTokens: sum?.inputTokens ?? 0,
    outputTokens: sum?.outputTokens ?? 0,
    cachedTokens: sum?.cachedTokens ?? 0,
    reasoningTokens: sum?.reasoningTokens ?? 0,
    totalTokens: sum?.totalTokens ?? 0,
    estimatedCostMicros: sum?.estimatedCostMicros ?? 0,
  }
}

export function addBreakdowns(
  a: TokenBreakdown,
  b: TokenBreakdown,
): TokenBreakdown {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cachedTokens: a.cachedTokens + b.cachedTokens,
    reasoningTokens: a.reasoningTokens + b.reasoningTokens,
    totalTokens: a.totalTokens + b.totalTokens,
    estimatedCostMicros: a.estimatedCostMicros + b.estimatedCostMicros,
  }
}

/**
 * Postgres returns `SUM`/`COUNT` over integer columns as int8, which arrives as
 * a bigint (or a string, depending on driver type parsing). Normalise all three.
 */
export function toNumber(
  value: bigint | number | string | null | undefined,
): number {
  const parsed = toNullableNumber(value)
  return parsed ?? 0
}

/** Like `toNumber`, but preserves the difference between "zero" and "no rows". */
export function toNullableNumber(
  value: bigint | number | string | null | undefined,
): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === "bigint") return Number(value)
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return Number.isFinite(value) ? value : null
}

export function buildWhere(
  filters: ResolvedUsageFilters,
): Prisma.AiUsageWhereInput {
  const start = getPeriodStart(filters.period)
  const features = SOURCE_FEATURES[filters.source] ?? null

  return {
    ...(start ? { createdAt: { gte: start } } : {}),
    ...(filters.modelId ? { modelId: filters.modelId } : {}),
    ...(features ? { feature: { in: features } } : {}),
  }
}

/**
 * The `buildWhere` equivalent for raw SQL, so aggregates that Prisma cannot
 * express (distinct counts, percentiles, joins) stay filtered identically.
 * `alias` qualifies the columns when the query joins another table; it is a
 * caller-supplied literal, never user input.
 */
export function buildRawWhere(
  filters: ResolvedUsageFilters,
  options: { alias?: string; extra?: Prisma.Sql[] } = {},
): Prisma.Sql {
  const { alias, extra = [] } = options
  const col = (name: string) =>
    Prisma.raw(alias ? `${alias}."${name}"` : `"${name}"`)

  const start = getPeriodStart(filters.period)
  const features = SOURCE_FEATURES[filters.source] ?? null

  const conditions: Prisma.Sql[] = [...extra]
  if (start) {
    conditions.push(Prisma.sql`${col("createdAt")} >= ${start}`)
  }
  if (filters.modelId) {
    conditions.push(Prisma.sql`${col("modelId")} = ${filters.modelId}`)
  }
  if (features) {
    conditions.push(
      Prisma.sql`${col("feature")}::text IN (${Prisma.join(
        features.map((feature) => Prisma.sql`${feature}`),
      )})`,
    )
  }

  return conditions.length > 0
    ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
    : Prisma.empty
}

/**
 * Whether the active source filter leaves any scan (or chat) rows in the
 * window. Per-unit costs derived from an excluded feature would read as a
 * confident zero, so the UI blanks them instead.
 */
export function sourceCovers(
  source: UsageSource,
  group: Set<AiUsageFeature>,
): boolean {
  const features = SOURCE_FEATURES[source]
  if (features === null) return true
  return features.some((feature) => group.has(feature))
}
