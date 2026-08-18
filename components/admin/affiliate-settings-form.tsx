"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateAffiliateSettingsAction } from "@/lib/admin/affiliate-settings-actions"

export function AffiliateSettingsForm({
  commissionRateBps,
  customerDiscountBps,
}: {
  commissionRateBps: number
  customerDiscountBps: number
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [commissionPercent, setCommissionPercent] = useState(commissionRateBps / 100)
  const [discountPercent, setDiscountPercent] = useState(customerDiscountBps / 100)

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      try {
        await updateAffiliateSettingsAction({
          commissionRateBps: Math.round(commissionPercent * 100),
          customerDiscountBps: Math.round(discountPercent * 100),
        })
        toast.success("Affiliate settings updated")
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Update failed")
      }
    })
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border border-border/60 p-5"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="commissionPercent">Affiliate commission (%)</Label>
          <Input
            id="commissionPercent"
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={commissionPercent}
            onChange={(e) => setCommissionPercent(Number(e.target.value) || 0)}
          />
          <p className="text-xs text-muted-foreground">
            Applied to new orders going forward. Past orders keep the rate that
            was in effect when they were recorded.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="discountPercent">Customer discount (%)</Label>
          <Input
            id="discountPercent"
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={discountPercent}
            onChange={(e) => setDiscountPercent(Number(e.target.value) || 0)}
          />
          <p className="text-xs text-muted-foreground">
            Applied to new coupons created for newly-approved affiliates.
            Existing coupons keep their original discount.
          </p>
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  )
}
