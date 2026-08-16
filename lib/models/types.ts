import type { ScanTier } from "@/generated/prisma/client"

export type { ScanTier }

export const SCAN_TIERS: ScanTier[] = ["starter", "plus", "pro"]

export const SCAN_TIER_LABELS: Record<ScanTier, string> = {
  starter: "Starter",
  plus: "Plus",
  pro: "Pro",
}

export type ThinkingLevel = "minimal" | "low" | "medium" | "high"

export const THINKING_LEVELS: ThinkingLevel[] = [
  "minimal",
  "low",
  "medium",
  "high",
]
