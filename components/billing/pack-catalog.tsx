import { PackCatalogClient } from "@/components/billing/pack-catalog-client"
import { requireAuthContext } from "@/lib/auth/context"
import { getBillingProfile, getBillingSummary } from "@/lib/billing/queries"
import { getPaymentCurrency, isSimulatedProvider } from "@/lib/payments"
import { listActiveScanPacks } from "@/lib/scans/packs"

export async function PackCatalog() {
  const ctx = await requireAuthContext()
  const [packs, summary, profile] = await Promise.all([
    listActiveScanPacks(),
    getBillingSummary(ctx.userId),
    getBillingProfile(ctx.userId),
  ])

  return (
    <section className="surface-panel rounded-xl border border-border/60 p-5">
      <h2 className="font-heading text-sm font-medium">Scan packs</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        One plan is active at a time. Buying a pack on a different plan replaces
        your balance rather than adding to it.
      </p>

      <div className="mt-6">
        <PackCatalogClient
          packs={packs.map((pack) => ({
            id: pack.id,
            label: pack.label,
            tier: pack.tier,
            scanCount: pack.scanCount,
            priceCents: pack.priceCents,
          }))}
          currentTier={summary.tier}
          currentRemaining={summary.remaining}
          hasBillingProfile={Boolean(profile)}
          isSimulated={isSimulatedProvider()}
          currency={getPaymentCurrency()}
        />
      </div>
    </section>
  )
}
