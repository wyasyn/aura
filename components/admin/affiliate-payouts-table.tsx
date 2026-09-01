"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  ResponsiveDialog,
} from "@/components/ui/responsive-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { recordAffiliatePayoutAction } from "@/lib/admin/affiliate-payout-actions"
import { formatMoneyCents } from "@/lib/payments/format"

export type AffiliateBalanceRow = {
  id: string
  name: string
  email: string
  couponCode: string | null
  orderCount: number
  earnedCents: number
  paidCents: number
  owedCents: number
}

export function AffiliatePayoutsTable({
  affiliates,
}: {
  affiliates: AffiliateBalanceRow[]
}) {
  const [target, setTarget] = useState<AffiliateBalanceRow | null>(null)
  const [open, setOpen] = useState(false)

  if (affiliates.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 p-6 text-sm text-muted-foreground">
        No approved affiliates yet.
      </div>
    )
  }

  const totalOwed = affiliates.reduce((sum, a) => sum + a.owedCents, 0)

  return (
    <>
      {totalOwed > 0 ? (
        <div className="surface-panel mb-4 flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-border/60 p-5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Total outstanding
          </p>
          <p className="font-heading text-2xl font-medium tabular-nums">
            {formatMoneyCents(totalOwed, "USD")}
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {affiliates.map((affiliate) => (
          <div
            key={affiliate.id}
            className="surface-panel flex flex-col gap-4 rounded-xl border border-border/60 p-5"
          >
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{affiliate.name}</p>
                {affiliate.couponCode ? (
                  <Badge variant="outline">{affiliate.couponCode}</Badge>
                ) : null}
              </div>
              <p className="text-muted-foreground text-sm">{affiliate.email}</p>
            </div>

            <dl className="grid grid-cols-3 gap-3 rounded-lg border border-border/60 p-3 text-center">
              <div>
                <dt className="text-muted-foreground text-xs">Earned</dt>
                <dd className="font-medium tabular-nums">
                  {formatMoneyCents(affiliate.earnedCents, "USD")}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Paid</dt>
                <dd className="font-medium tabular-nums">
                  {formatMoneyCents(affiliate.paidCents, "USD")}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Owed</dt>
                <dd
                  className={`font-medium tabular-nums ${
                    affiliate.owedCents > 0 ? "text-primary" : ""
                  }`}
                >
                  {formatMoneyCents(affiliate.owedCents, "USD")}
                </dd>
              </div>
            </dl>

            <p className="text-muted-foreground text-xs">
              {affiliate.orderCount} confirmed order
              {affiliate.orderCount === 1 ? "" : "s"}
            </p>

            <Button
              size="sm"
              variant="outline"
              className="mt-auto w-full"
              disabled={affiliate.owedCents <= 0}
              onClick={() => {
                setTarget(affiliate)
                setOpen(true)
              }}
            >
              {affiliate.owedCents > 0 ? "Record payout" : "Nothing owed"}
            </Button>
          </div>
        ))}
      </div>

      <RecordPayoutDialog
        affiliate={target}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}

function RecordPayoutDialog({
  affiliate,
  open,
  onOpenChange,
}: {
  affiliate: AffiliateBalanceRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")

  if (!affiliate) return null

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amountCents = Math.round(Number(amount) * 100)
    if (!amountCents || amountCents <= 0) return

    startTransition(async () => {
      try {
        await recordAffiliatePayoutAction({
          affiliateId: affiliate!.id,
          amountCents,
          note: note || undefined,
        })
        toast.success("Payout recorded")
        setAmount("")
        setNote("")
        onOpenChange(false)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to record payout")
      }
    })
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Record payout for ${affiliate.name}`}
      description={`Owed: ${formatMoneyCents(affiliate.owedCents, "USD")}`}
      className="sm:max-w-md"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4 p-6">
        <div className="space-y-2">
          <Label htmlFor="payout-amount">Amount (USD)</Label>
          <Input
            id="payout-amount"
            type="number"
            min={0.01}
            step={0.01}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={(affiliate.owedCents / 100).toFixed(2)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="payout-note">Note</Label>
          <Textarea
            id="payout-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Paid via bank transfer, ref #1234 (optional)"
            rows={3}
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Recording…" : "Record payout"}
        </Button>
      </form>
    </ResponsiveDialog>
  )
}
