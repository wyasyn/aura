import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { mockPaymentDriver } from "@/lib/payments/mock/driver"
import type { ConfirmIntentInput } from "@/lib/payments/types"

process.env.MOCK_PAYMENT_DELAY_MS = "0"

function confirmInput(
  number: string,
  previousStatus: ConfirmIntentInput["previousStatus"] = "pending",
): ConfirmIntentInput {
  return {
    ref: "mock_pi_test",
    amountCents: 1499,
    currency: "USD",
    previousStatus,
    card: {
      number,
      expiry: "12/34",
      cvc: "123",
      name: "Test Person",
    },
  }
}

describe("mock payment driver", () => {
  it("creates a pending intent with a provider reference", async () => {
    const intent = await mockPaymentDriver.createIntent({
      paymentId: "payment-1",
      amountCents: 1499,
      currency: "USD",
      description: "Plus — 12 scans",
      customerEmail: "person@example.com",
      customerName: "Test Person",
    })

    assert.equal(intent.status, "pending")
    assert.match(intent.ref, /^mock_pi_/)
    assert.equal(intent.amountCents, 1499)
  })

  it("succeeds on the success test card", async () => {
    const intent = await mockPaymentDriver.confirmIntent(
      confirmInput("4242424242424242"),
    )

    assert.equal(intent.status, "succeeded")
    assert.equal(intent.cardBrand, "Visa")
    assert.equal(intent.cardLast4, "4242")
    assert.equal(intent.failureReason, undefined)
  })

  it("declines on the decline test card", async () => {
    const intent = await mockPaymentDriver.confirmIntent(
      confirmInput("4000 0000 0000 0002"),
    )

    assert.equal(intent.status, "failed")
    assert.equal(intent.failureReason, "card_declined")
  })

  it("reports insufficient funds", async () => {
    const intent = await mockPaymentDriver.confirmIntent(
      confirmInput("4000000000009995"),
    )

    assert.equal(intent.status, "failed")
    assert.equal(intent.failureReason, "insufficient_funds")
  })

  it("asks for verification once, then succeeds on retry", async () => {
    const first = await mockPaymentDriver.confirmIntent(
      confirmInput("4000000000003220"),
    )
    assert.equal(first.status, "requires_action")

    const second = await mockPaymentDriver.confirmIntent(
      confirmInput("4000000000003220", "requires_action"),
    )
    assert.equal(second.status, "succeeded")
  })

  it("treats unknown cards as successful", async () => {
    const intent = await mockPaymentDriver.confirmIntent(
      confirmInput("5555555555554444"),
    )

    assert.equal(intent.status, "succeeded")
    assert.equal(intent.cardBrand, "Mastercard")
  })
})
