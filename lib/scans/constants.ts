import type { AiProvider } from "@/generated/prisma/client"
import type { UsageInput } from "@/lib/scans/cost"

/** Fallback when no AiModelRate row resolves. Mirrors the Starter tier model. */
export const DEFAULT_SCAN_MODEL = {
  provider: "gemini" as AiProvider,
  modelId: "gemini-3.5-flash-lite",
  displayName: "Gemini 3.5 Flash-Lite",
} as const

export const DEFAULT_MOCK_USAGE: UsageInput = {
  provider: DEFAULT_SCAN_MODEL.provider,
  modelId: DEFAULT_SCAN_MODEL.modelId,
  inputTokens: 0,
  outputTokens: 0,
  cachedTokens: 0,
}

export function getPricingMarginBps(): number {
  const raw = process.env.PRICING_MARGIN_BPS
  const parsed = raw ? Number.parseInt(raw, 10) : 2000
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 2000
}

export function getTargetMarginBps(): number {
  const raw = process.env.TARGET_MARGIN_BPS
  const parsed = raw ? Number.parseInt(raw, 10) : 7000
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 7000
}

const CHAT_TOKENS_PER_SCAN_BY_TIER: Record<
  import("@/generated/prisma/client").ScanTier,
  number
> = {
  starter: parseEnvInt("STARTER_CHAT_TOKENS_PER_SCAN", 40_000),
  plus: parseEnvInt("PLUS_CHAT_TOKENS_PER_SCAN", 60_000),
  pro: parseEnvInt("PRO_CHAT_TOKENS_PER_SCAN", 80_000),
}

function parseEnvInt(key: string, fallback: number): number {
  const raw = process.env[key]
  const parsed = raw ? Number.parseInt(raw, 10) : fallback
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

/** Chat token budget granted per scan credit on pack/signup/admin grants. */
export function getChatTokensPerScanForTier(
  tier: import("@/generated/prisma/client").ScanTier,
): number {
  return CHAT_TOKENS_PER_SCAN_BY_TIER[tier]
}

/** Rough average tokens per chat turn for UI estimates. */
export const AVG_CHAT_TOKENS_PER_MESSAGE = parseEnvInt(
  "AVG_CHAT_TOKENS_PER_MESSAGE",
  1_500,
)

/** Max user message length in characters. */
export const MAX_CHAT_MESSAGE_LENGTH = 500

/** Max turns per conversation. */
export const MAX_CHAT_TURNS_PER_CONVERSATION = 40

/** Rate limit: messages per minute per user. */
export const CHAT_RATE_LIMIT_PER_MINUTE = 20

/** Estimated max tokens debited for a single message (pre-check). */
export const CHAT_MESSAGE_TOKEN_ESTIMATE = parseEnvInt(
  "CHAT_MESSAGE_TOKEN_ESTIMATE",
  4_000,
)
