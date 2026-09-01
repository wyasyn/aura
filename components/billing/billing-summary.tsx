import { IconCoin, IconHistory, IconSparkles } from "@tabler/icons-react"

import { StatCard } from "@/components/dashboard/page-header"
import { Badge } from "@/components/ui/badge"
import { requireAuthContext } from "@/lib/auth/context"
import { getBillingSummary } from "@/lib/billing/queries"
import { SCAN_TIER_LABELS } from "@/lib/models/types"

export async function BillingSummary() {
  const ctx = await requireAuthContext()
  const summary = await getBillingSummary(ctx.userId)

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        label="Current plan"
        value={SCAN_TIER_LABELS[summary.tier]}
        icon={<IconSparkles />}
        hint={
          <Badge variant="secondary" className="font-normal">
            One active plan at a time
          </Badge>
        }
      />
      <StatCard
        label="Scans remaining"
        value={summary.remaining}
        icon={<IconCoin />}
        hint="Each analysis uses one scan"
      />
      <StatCard
        label="Scans used"
        value={summary.periodUsed}
        icon={<IconHistory />}
        hint={
          summary.periodGranted > 0
            ? `of ${summary.periodGranted} on this plan`
            : "Since your current plan started"
        }
      />
    </div>
  )
}
