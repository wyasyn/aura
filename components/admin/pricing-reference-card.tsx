import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { prisma } from "@/lib/db/client"
import { SCAN_TIER_LABELS } from "@/lib/models/types"
import { listActiveScanPacks } from "@/lib/scans/packs"

function formatMicroUsdPer1M(micros: number): string {
  return `$${(micros / 1_000_000).toFixed(4)}`
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export async function PricingReferenceCard() {
  const [rates, packs] = await Promise.all([
    prisma.aiModelRate.findMany({
      where: { isActive: true },
      orderBy: [{ provider: "asc" }, { modelId: "asc" }],
    }),
    listActiveScanPacks(),
  ])

  return (
    <section className="space-y-6 rounded-xl border border-border/60 p-4">
      <div>
        <h2 className="font-heading text-lg font-medium">Scan packs</h2>
        <p className="text-sm text-muted-foreground">
          Fixed scan allowances per tier. Payment integration is planned — use
          admin grant until Stripe is wired.
        </p>
      </div>

      {packs.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pack</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Scans</TableHead>
              <TableHead>Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {packs.map((pack) => (
              <TableRow key={pack.id}>
                <TableCell className="font-medium">{pack.label}</TableCell>
                <TableCell>{SCAN_TIER_LABELS[pack.tier]}</TableCell>
                <TableCell>{pack.scanCount}</TableCell>
                <TableCell>{formatPrice(pack.priceCents)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-sm text-muted-foreground">
          No scan packs seeded yet. Run{" "}
          <code className="font-mono text-xs">npm run db:seed-packs</code>.
        </p>
      )}

      <div>
        <h2 className="font-heading text-lg font-medium">Model cost reference</h2>
        <p className="text-sm text-muted-foreground">
          Internal provider rates for margin monitoring. Manage models on the{" "}
          <a href="/admin/models" className="text-foreground underline">
            models page
          </a>
          .
        </p>
      </div>

      {rates.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Model</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Input / 1M</TableHead>
              <TableHead>Output / 1M</TableHead>
              <TableHead>Cached / 1M</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rates.map((rate) => (
              <TableRow key={rate.id}>
                <TableCell>
                  <div className="font-medium">
                    {rate.displayName ?? rate.modelId}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {rate.provider} · {rate.modelId}
                  </div>
                </TableCell>
                <TableCell>
                  {rate.assignedTier
                    ? rate.assignedTier === "pro"
                      ? "Pro (live)"
                      : SCAN_TIER_LABELS[rate.assignedTier]
                    : "—"}
                </TableCell>
                <TableCell>
                  {formatMicroUsdPer1M(rate.inputMicrosPer1M)}
                </TableCell>
                <TableCell>
                  {formatMicroUsdPer1M(rate.outputMicrosPer1M)}
                </TableCell>
                <TableCell>
                  {formatMicroUsdPer1M(rate.cachedInputMicrosPer1M)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-sm text-muted-foreground">
          No active model rates seeded yet. Run{" "}
          <code className="font-mono text-xs">npm run db:seed-rates</code>.
        </p>
      )}
    </section>
  )
}
