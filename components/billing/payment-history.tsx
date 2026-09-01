import { PaymentHistoryClient } from "@/components/billing/payment-history-client"
import { requireAuthContext } from "@/lib/auth/context"
import { listUserPayments } from "@/lib/billing/queries"

export async function PaymentHistory() {
  const ctx = await requireAuthContext()
  const payments = await listUserPayments(ctx.userId)

  return (
    <section className="surface-panel rounded-xl border border-border/60 p-5">
      <h2 className="font-heading text-sm font-medium">Payment history</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Receipts stay available even if you later change your billing details.
      </p>

      <div className="mt-5">
        <PaymentHistoryClient
          payments={payments.map((payment) => ({
            id: payment.id,
            receiptNumber: payment.receiptNumber,
            status: payment.status,
            amountCents: payment.amountCents,
            currency: payment.currency,
            description: payment.pack?.label ?? `${payment.scanCount} scans`,
            scanCount: payment.scanCount,
            cardLabel:
              payment.cardBrand && payment.cardLast4
                ? `${payment.cardBrand} ${payment.cardLast4}`
                : null,
            createdAt: (payment.paidAt ?? payment.createdAt).toLocaleDateString(
              "en-US",
              { year: "numeric", month: "short", day: "numeric" },
            ),
          }))}
        />
      </div>
    </section>
  )
}
