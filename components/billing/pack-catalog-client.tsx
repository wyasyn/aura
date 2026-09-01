"use client"

import { useState } from "react"
import { IconCheck } from "@tabler/icons-react"

import {
  CheckoutDialog,
  type CheckoutPack,
} from "@/components/billing/checkout-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SCAN_TIERS, SCAN_TIER_LABELS, type ScanTier } from "@/lib/models/types"
import { formatMoneyCents } from "@/lib/payments/format"

const TIER_BLURB: Record<ScanTier, string> = {
  starter: "Everyday analysis for routine check-ins.",
  plus: "Deeper analysis with a stronger model.",
  pro: "Top model plus live camera scanning.",
}

export function PackCatalogClient({
  packs,
  currentTier,
  currentRemaining,
  hasBillingProfile,
  isSimulated,
  currency,
}: {
  packs: CheckoutPack[]
  currentTier: ScanTier
  currentRemaining: number
  hasBillingProfile: boolean
  isSimulated: boolean
  currency: string
}) {
  const [selected, setSelected] = useState<CheckoutPack | null>(null)
  const [open, setOpen] = useState(false)
  // Bumped on every open so the dialog remounts with a clean checkout state.
  const [session, setSession] = useState(0)

  function onBuy(pack: CheckoutPack) {
    setSelected(pack)
    setSession((count) => count + 1)
    setOpen(true)
  }

  return (
    <>
      <div className="space-y-6">
        {SCAN_TIERS.map((tier) => {
          const tierPacks = packs.filter((pack) => pack.tier === tier)
          if (tierPacks.length === 0) {
            return null
          }

          return (
            <div key={tier}>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-heading text-sm font-medium">
                  {SCAN_TIER_LABELS[tier]}
                </h3>
                {tier === currentTier ? (
                  <Badge variant="secondary" className="gap-1 font-normal">
                    <IconCheck className="size-3" />
                    Current plan
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {TIER_BLURB[tier]}
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {tierPacks.map((pack) => (
                  <div
                    key={pack.id}
                    className="surface-panel flex flex-col justify-between gap-4 rounded-xl border border-border/60 p-5"
                  >
                    <div>
                      <p className="font-heading text-2xl font-medium tabular-nums">
                        {formatMoneyCents(pack.priceCents, currency)}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {pack.scanCount} scans
                      </p>
                    </div>
                    <Button
                      variant={tier === currentTier ? "default" : "outline"}
                      onClick={() => onBuy(pack)}
                    >
                      {tier === currentTier ? "Top up" : "Switch and buy"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <CheckoutDialog
        key={session}
        pack={selected}
        currentTier={currentTier}
        currentRemaining={currentRemaining}
        hasBillingProfile={hasBillingProfile}
        isSimulated={isSimulated}
        currency={currency}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}
