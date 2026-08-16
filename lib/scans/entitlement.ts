import { cache } from "react"

import type { ScanTier } from "@/generated/prisma/client"
import { getTokenBudget } from "@/lib/chat/token-budget"
import { getUserScanTier } from "@/lib/models/queries"
import { getScansRemaining } from "@/lib/scans/balance"
import { CHAT_MESSAGE_TOKEN_ESTIMATE } from "@/lib/scans/constants"

export type ScanEntitlement = {
  tier: ScanTier
  scansRemaining: number
  messagesRemaining: number
  /** A new analysis can be started. */
  canScan: boolean
  /** At least one more chat message fits in the token budget. */
  canChat: boolean
}

/**
 * Single read of what a user is currently allowed to do. The UI uses it to
 * gate entry points; the API routes still enforce independently, so a stale or
 * missing entitlement can never grant access on its own.
 */
export const getScanEntitlement = cache(
  async (userId: string): Promise<ScanEntitlement> => {
    const [tier, scansRemaining, budget] = await Promise.all([
      getUserScanTier(userId),
      getScansRemaining(userId),
      getTokenBudget(userId),
    ])

    return {
      tier,
      scansRemaining,
      messagesRemaining: budget.estimatedMessagesRemaining,
      canScan: scansRemaining > 0,
      canChat:
        budget.tokenBudgetRemaining >= BigInt(CHAT_MESSAGE_TOKEN_ESTIMATE),
    }
  },
)
