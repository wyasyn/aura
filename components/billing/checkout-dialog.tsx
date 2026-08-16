"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  IconAlertTriangle,
  IconCheck,
  IconLock,
  IconShieldCheck,
} from "@tabler/icons-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ResponsiveDialog } from "@/components/ui/responsive-dialog"
import { confirmPaymentAction, startCheckoutAction } from "@/lib/billing/actions"
import { SCAN_TIER_LABELS, type ScanTier } from "@/lib/models/types"
import { formatMoneyCents } from "@/lib/payments/format"
import { TEST_CARDS, formatCardNumber } from "@/lib/payments/test-cards"

export type CheckoutPack = {
  id: string
  label: string
  tier: ScanTier
  scanCount: number
  priceCents: number
}

type Step = "review" | "card" | "done"

const EMPTY_CARD = { number: "", expiry: "", cvc: "", name: "" }

export function CheckoutDialog({
  pack,
  currentTier,
  currentRemaining,
  hasBillingProfile,
  isSimulated,
  currency,
  open,
  onOpenChange,
}: {
  pack: CheckoutPack | null
  currentTier: ScanTier
  currentRemaining: number
  hasBillingProfile: boolean
  isSimulated: boolean
  currency: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [step, setStep] = useState<Step>("review")
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [card, setCard] = useState(EMPTY_CARD)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsVerification, setNeedsVerification] = useState(false)

  if (!pack) {
    return null
  }

  const price = formatMoneyCents(pack.priceCents, currency)
  const isTierChange = pack.tier !== currentTier
  const forfeits = isTierChange && currentRemaining > 0

  async function onStart() {
    if (!pack) return
    setPending(true)
    setError(null)
    const result = await startCheckoutAction({ packId: pack.id })
    setPending(false)

    if (!result.ok) {
      setError(result.error)
      return
    }
    setPaymentId(result.paymentId)
    setStep("card")
  }

  async function onPay() {
    if (!paymentId || !pack) return
    setPending(true)
    setError(null)
    const result = await confirmPaymentAction({ paymentId, card })
    setPending(false)

    if (!result.ok) {
      setError(result.error)
      router.refresh()
      return
    }

    if (result.status === "requires_action") {
      setNeedsVerification(true)
      setError(null)
      toast.info("Your bank asked for extra verification. Confirm again.")
      return
    }

    setStep("done")
    toast.success(`${result.scanCount} scans added to your account`)
    router.refresh()
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={step === "done" ? "Payment complete" : "Checkout"}
      description={
        step === "done" ? undefined : `${pack.label} for ${price}`
      }
      className="sm:max-w-lg"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-6">
        {step !== "done" ? (
          <OrderSummary
            pack={pack}
            price={price}
            currentTier={currentTier}
            isTierChange={isTierChange}
            forfeits={forfeits}
            currentRemaining={currentRemaining}
          />
        ) : null}

        {step === "review" ? (
          <>
            {!hasBillingProfile ? (
              <Notice tone="warning">
                Add your billing details below the pack list before you check
                out.
              </Notice>
            ) : null}
            {error ? <Notice tone="error">{error}</Notice> : null}
            <Button
              onClick={onStart}
              disabled={pending || !hasBillingProfile}
              className="w-full"
            >
              {pending ? "Preparing..." : `Continue to payment`}
            </Button>
          </>
        ) : null}

        {step === "card" ? (
          <>
            {isSimulated ? <TestCardHint /> : null}

            <div className="space-y-4">
              <div>
                <Label htmlFor="checkout-card-name">Name on card</Label>
                <Input
                  id="checkout-card-name"
                  className="mt-1.5"
                  autoComplete="cc-name"
                  value={card.name}
                  onChange={(event) =>
                    setCard((c) => ({ ...c, name: event.target.value }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="checkout-card-number">Card number</Label>
                <Input
                  id="checkout-card-number"
                  className="mt-1.5 tabular-nums"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder="4242 4242 4242 4242"
                  value={formatCardNumber(card.number)}
                  onChange={(event) =>
                    setCard((c) => ({ ...c, number: event.target.value }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="checkout-card-expiry">Expiry</Label>
                  <Input
                    id="checkout-card-expiry"
                    className="mt-1.5 tabular-nums"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    placeholder="MM/YY"
                    maxLength={5}
                    value={card.expiry}
                    onChange={(event) =>
                      setCard((c) => ({
                        ...c,
                        expiry: formatExpiry(event.target.value),
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="checkout-card-cvc">CVC</Label>
                  <Input
                    id="checkout-card-cvc"
                    className="mt-1.5 tabular-nums"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    placeholder="123"
                    maxLength={4}
                    value={card.cvc}
                    onChange={(event) =>
                      setCard((c) => ({
                        ...c,
                        cvc: event.target.value.replace(/\D/g, ""),
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            {needsVerification ? (
              <Notice tone="warning">
                Extra verification requested. Confirm once more to complete the
                payment.
              </Notice>
            ) : null}
            {error ? <Notice tone="error">{error}</Notice> : null}

            <Button onClick={onPay} disabled={pending} className="w-full">
              <IconLock className="size-4" />
              {pending ? "Processing..." : `Pay ${price}`}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Card details are never stored. Only the brand and last four digits
              are kept for your receipt.
            </p>
          </>
        ) : null}

        {step === "done" ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <IconCheck className="size-6" />
            </span>
            <p className="font-heading text-lg font-medium">
              {pack.scanCount} {SCAN_TIER_LABELS[pack.tier]} scans added
            </p>
            <p className="text-sm text-muted-foreground">
              A receipt is on its way to your email, and stays available in
              payment history below.
            </p>
            <Button className="mt-2" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        ) : null}
      </div>
    </ResponsiveDialog>
  )
}

function OrderSummary({
  pack,
  price,
  currentTier,
  isTierChange,
  forfeits,
  currentRemaining,
}: {
  pack: CheckoutPack
  price: string
  currentTier: ScanTier
  isTierChange: boolean
  forfeits: boolean
  currentRemaining: number
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border/60 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-medium">{pack.label}</p>
            <p className="text-sm text-muted-foreground">
              {pack.scanCount} scans on the {SCAN_TIER_LABELS[pack.tier]} plan
            </p>
          </div>
          <p className="font-heading text-lg font-medium tabular-nums">
            {price}
          </p>
        </div>
      </div>

      {isTierChange ? (
        <Notice tone="warning">
          This switches you from {SCAN_TIER_LABELS[currentTier]} to{" "}
          {SCAN_TIER_LABELS[pack.tier]}.{" "}
          {forfeits
            ? `Your ${currentRemaining} remaining ${SCAN_TIER_LABELS[currentTier]} scans will be replaced, not added to.`
            : "Your balance will be set to the new pack size."}
        </Notice>
      ) : null}
    </div>
  )
}

function TestCardHint() {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/40 p-4">
      <p className="flex items-center gap-2 text-xs font-medium">
        <IconShieldCheck className="size-4 text-muted-foreground" />
        Simulated payment, no money moves
      </p>
      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
        {TEST_CARDS.map((testCard) => (
          <li key={testCard.number} className="flex justify-between gap-3">
            <span className="tabular-nums">
              {formatCardNumber(testCard.number)}
            </span>
            <span>{testCard.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Notice({
  tone,
  children,
}: {
  tone: "warning" | "error"
  children: React.ReactNode
}) {
  return (
    <p
      className={
        tone === "error"
          ? "flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          : "flex gap-2 rounded-lg border border-border/60 bg-muted/40 p-3 text-sm text-muted-foreground"
      }
    >
      <IconAlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4)
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
}
