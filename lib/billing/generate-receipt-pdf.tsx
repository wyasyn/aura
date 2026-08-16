import { renderToBuffer } from "@react-pdf/renderer"

import { prisma } from "@/lib/db/client"
import { withDbRetry } from "@/lib/db/retry"
import { SCAN_TIER_LABELS } from "@/lib/models/types"
import { getBrandLogoDataUri } from "@/lib/pdf/brand-logo"
import { registerReportFonts } from "@/lib/pdf/fonts"
import {
  ReceiptDocument,
  type ReceiptBilling,
} from "@/lib/pdf/receipt-document"

/** Reads the billing identity frozen onto the payment, not the live profile. */
function parseBillingSnapshot(value: unknown): ReceiptBilling | null {
  if (!value || typeof value !== "object") {
    return null
  }
  const record = value as Record<string, unknown>
  const fullName = record.fullName
  const email = record.email
  if (typeof fullName !== "string" || typeof email !== "string") {
    return null
  }

  const text = (key: string) =>
    typeof record[key] === "string" ? (record[key] as string) : null

  return {
    fullName,
    email,
    phone: text("phone"),
    addressLine1: text("addressLine1"),
    addressLine2: text("addressLine2"),
    city: text("city"),
    state: text("state"),
    postalCode: text("postalCode"),
    country: text("country"),
    taxId: text("taxId"),
  }
}

export async function generateReceiptPdf(paymentId: string, userId: string) {
  registerReportFonts()

  const payment = await withDbRetry(() =>
    prisma.payment.findFirst({
      where: { id: paymentId, userId },
      include: {
        pack: { select: { label: true } },
        user: { select: { name: true, email: true } },
      },
    }),
  )

  if (!payment || payment.status !== "succeeded") {
    return null
  }

  const billing = parseBillingSnapshot(payment.billingSnapshot) ?? {
    fullName: payment.user.name,
    email: payment.user.email,
  }

  const paidAt = (payment.paidAt ?? payment.createdAt).toLocaleDateString(
    "en-US",
    { year: "numeric", month: "long", day: "numeric" },
  )

  const buffer = await renderToBuffer(
    <ReceiptDocument
      data={{
        receiptNumber: payment.receiptNumber,
        paidAt,
        description: payment.pack?.label ?? `${payment.scanCount} scans`,
        tierLabel: SCAN_TIER_LABELS[payment.tier],
        scanCount: payment.scanCount,
        amountCents: payment.amountCents,
        currency: payment.currency,
        cardBrand: payment.cardBrand,
        cardLast4: payment.cardLast4,
        billing,
        logoDataUri: getBrandLogoDataUri(),
      }}
    />,
  )

  return { buffer, receiptNumber: payment.receiptNumber }
}
