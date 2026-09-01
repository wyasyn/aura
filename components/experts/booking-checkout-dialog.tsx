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

import { StripeCardForm } from "@/components/billing/stripe-card-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ResponsiveDialog } from "@/components/ui/responsive-dialog"
import {
  confirmBookingPaymentAction,
  confirmBookingStripePaymentAction,
  startBookingCheckoutAction,
} from "@/lib/experts/booking-actions"
import { formatMoneyCents } from "@/lib/payments/format"
import { TEST_CARDS, formatCardNumber } from "@/lib/payments/test-cards"

export type BookableSlot = {
  id: string
  startTime: string | Date
  endTime: string | Date
  label: string
}

type Step = "review" | "card" | "done"

const EMPTY_CARD = { number: "", expiry: "", cvc: "", name: "" }

export function BookingCheckoutDialog({
  expertName,
  priceCents,
  currency,
  hasBillingProfile,
  isSimulated,
  slot,
  open,
  onOpenChange,
}: {
  expertName: string
  priceCents: number
  currency: string
  hasBillingProfile: boolean
  isSimulated: boolean
  slot: BookableSlot | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [step, setStep] = useState<Step>("review")
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [card, setCard] = useState(EMPTY_CARD)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsVerification, setNeedsVerification] = useState(false)

  if (!slot) {
    return null
  }

  const price = formatMoneyCents(priceCents, currency)

  async function onStart() {
    if (!slot) return
    setPending(true)
    setError(null)
    const result = await startBookingCheckoutAction({ slotId: slot.id })
    setPending(false)

    if (!result.ok) {
      setError(result.error)
      router.refresh()
      return
    }
    setBookingId(result.bookingId)
    setClientSecret(result.clientSecret ?? null)
    setStep("card")
  }

  async function onPay() {
    if (!bookingId) return
    setPending(true)
    setError(null)
    const result = await confirmBookingPaymentAction({ bookingId, card })
    setPending(false)
    handleConfirmResult(result)
  }

  async function onStripeSucceeded() {
    if (!bookingId) return
    setPending(true)
    setError(null)
    const result = await confirmBookingStripePaymentAction({ bookingId })
    setPending(false)
    handleConfirmResult(result)
  }

  function handleConfirmResult(
    result: Awaited<ReturnType<typeof confirmBookingPaymentAction>>,
  ) {
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
    toast.success("Consultation booked")
    router.refresh()
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={step === "done" ? "Booking confirmed" : "Book consultation"}
      description={
        step === "done" ? undefined : `${expertName} · ${slot.label}`
      }
      className="sm:max-w-lg"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-6">
        {step === "review" ? (
          <>
            <div className="rounded-xl border border-border/60 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{expertName}</p>
                  <p className="text-sm text-muted-foreground">{slot.label}</p>
                </div>
                <p className="font-heading text-lg font-medium tabular-nums">
                  {price}
                </p>
              </div>
            </div>
            {!hasBillingProfile ? (
              <Notice tone="warning">
                Add your billing details from the billing page before you check
                out.
              </Notice>
            ) : null}
            {error ? <Notice tone="error">{error}</Notice> : null}
            <Button
              onClick={onStart}
              disabled={pending || !hasBillingProfile}
              className="w-full"
            >
              {pending ? "Preparing..." : "Continue to payment"}
            </Button>
          </>
        ) : null}

        {step === "card" ? (
          <>
            {isSimulated ? (
              <>
                <TestCardHint />

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="booking-card-name">Name on card</Label>
                    <Input
                      id="booking-card-name"
                      className="mt-1.5"
                      autoComplete="cc-name"
                      value={card.name}
                      onChange={(event) =>
                        setCard((c) => ({ ...c, name: event.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="booking-card-number">Card number</Label>
                    <Input
                      id="booking-card-number"
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
                      <Label htmlFor="booking-card-expiry">Expiry</Label>
                      <Input
                        id="booking-card-expiry"
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
                      <Label htmlFor="booking-card-cvc">CVC</Label>
                      <Input
                        id="booking-card-cvc"
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
                    Extra verification requested. Confirm once more to complete
                    the payment.
                  </Notice>
                ) : null}
                {error ? <Notice tone="error">{error}</Notice> : null}

                <Button onClick={onPay} disabled={pending} className="w-full">
                  <IconLock className="size-4" />
                  {pending ? "Processing..." : `Pay ${price}`}
                </Button>
              </>
            ) : clientSecret ? (
              <>
                <StripeCardForm
                  clientSecret={clientSecret}
                  amountLabel={price}
                  onSucceeded={onStripeSucceeded}
                  onError={(message) => {
                    setError(message)
                    router.refresh()
                  }}
                />
                {needsVerification ? (
                  <Notice tone="warning">
                    Extra verification requested. Confirm once more to complete
                    the payment.
                  </Notice>
                ) : null}
                {error ? <Notice tone="error">{error}</Notice> : null}
              </>
            ) : (
              <Notice tone="error">
                Payment could not be started. Close this dialog and try again.
              </Notice>
            )}

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
              Consultation with {expertName} confirmed
            </p>
            <p className="text-sm text-muted-foreground">
              {slot.label}. Find your video call link on the appointments page
              a few minutes before it starts.
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
