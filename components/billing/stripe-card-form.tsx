"use client"

import { useState } from "react"
import { loadStripe, type Stripe } from "@stripe/stripe-js"
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js"
import { IconLock } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"

let stripePromise: Promise<Stripe | null> | null = null

function getStripePromise() {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    stripePromise = key ? loadStripe(key) : Promise.resolve(null)
  }
  return stripePromise
}

/**
 * Card entry for the Stripe checkout step. The Payment Element renders
 * Stripe's own hosted card fields inside an iframe, so the raw card number,
 * expiry and CVC are typed directly into Stripe's iframe and never pass
 * through our page's JS or our server — required for PCI compliance.
 */
export function StripeCardForm({
  clientSecret,
  amountLabel,
  onSucceeded,
  onError,
}: {
  clientSecret: string
  amountLabel: string
  onSucceeded: () => void
  onError: (message: string) => void
}) {
  return (
    <Elements
      stripe={getStripePromise()}
      options={{
        clientSecret,
        appearance: { theme: "stripe" },
      }}
    >
      <StripePayButton
        amountLabel={amountLabel}
        onSucceeded={onSucceeded}
        onError={onError}
      />
    </Elements>
  )
}

function StripePayButton({
  amountLabel,
  onSucceeded,
  onError,
}: {
  amountLabel: string
  onSucceeded: () => void
  onError: (message: string) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [pending, setPending] = useState(false)

  async function handlePay() {
    if (!stripe || !elements) return
    setPending(true)

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    })

    if (error) {
      setPending(false)
      onError(error.message ?? "The payment could not be completed")
      return
    }

    if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "processing") {
      onSucceeded()
      return
    }

    setPending(false)
    onError("The payment could not be completed")
  }

  return (
    <div className="space-y-4">
      <PaymentElement options={{ fields: { billingDetails: "auto" } }} />
      <Button
        type="button"
        onClick={handlePay}
        disabled={pending || !stripe || !elements}
        className="w-full"
      >
        <IconLock className="size-4" />
        {pending ? "Processing..." : `Pay ${amountLabel}`}
      </Button>
    </div>
  )
}
