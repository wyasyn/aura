"use client"

import { createContext, useContext, type ReactNode } from "react"

import type { ScanEntitlement } from "@/lib/scans/entitlement"

/**
 * Permissive default. Without a provider the UI stays unblocked and the server
 * routes remain the real gate, so a missing provider degrades to "no paywall
 * prompt" rather than locking a paying user out.
 */
const FALLBACK: ScanEntitlement = {
  tier: "starter",
  scansRemaining: 0,
  messagesRemaining: 0,
  canScan: true,
  canChat: true,
}

const EntitlementContext = createContext<ScanEntitlement>(FALLBACK)

export function EntitlementProvider({
  value,
  children,
}: {
  value: ScanEntitlement
  children: ReactNode
}) {
  return (
    <EntitlementContext.Provider value={value}>
      {children}
    </EntitlementContext.Provider>
  )
}

export function useEntitlement(): ScanEntitlement {
  return useContext(EntitlementContext)
}
