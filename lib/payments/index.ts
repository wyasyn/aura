import type { PaymentProvider } from "@/generated/prisma/client"

import { mockPaymentDriver } from "@/lib/payments/mock/driver"
import type { PaymentDriver } from "@/lib/payments/types"

/**
 * Resolves the active gateway. Adding a real one means writing a driver that
 * satisfies PaymentDriver and registering it here, nothing else changes.
 */
export function getPaymentDriver(): PaymentDriver {
  const configured = process.env.PAYMENT_PROVIDER?.trim().toLowerCase()

  switch (configured) {
    case "stripe":
      throw new Error(
        "PAYMENT_PROVIDER=stripe is not implemented yet, add lib/payments/stripe/driver.ts",
      )
    case "mock":
    case undefined:
    case "":
      return mockPaymentDriver
    default:
      throw new Error(`Unknown PAYMENT_PROVIDER: ${configured}`)
  }
}

export function getActiveProviderId(): PaymentProvider {
  return getPaymentDriver().id
}

export function isSimulatedProvider(): boolean {
  return getActiveProviderId() === "mock"
}

export function getPaymentCurrency(): string {
  const raw = process.env.PAYMENT_CURRENCY?.trim().toUpperCase()
  return raw && /^[A-Z]{3}$/.test(raw) ? raw : "USD"
}
