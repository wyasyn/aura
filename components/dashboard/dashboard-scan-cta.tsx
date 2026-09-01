import Link from "next/link"
import { IconCamera, IconSparkles } from "@tabler/icons-react"

import { DotField } from "@/components/ui/dot-field"
import { Button } from "@/components/ui/button"
import { requireAuthContext } from "@/lib/auth/context"
import { BILLING_HREF } from "@/lib/billing/constants"
import { getUserDashboardStats } from "@/lib/dashboard/stats"

/**
 * Primary call to action on the overview page. Carries the remaining-scan
 * state so it reads as live rather than as a static banner, and borrows the
 * scan flow's halo so the app's most important action is visually first.
 *
 * `getUserDashboardStats` is React-cached, so sharing it with
 * `DashboardOverviewStats` costs no extra query.
 */
export async function DashboardScanCta() {
  const ctx = await requireAuthContext()
  const stats = await getUserDashboardStats(ctx.userId)
  const remaining = stats.remaining
  const hasScans = remaining > 0

  return (
    <section className="scan-halo surface-panel relative isolate overflow-hidden rounded-2xl border border-border/60 p-6 sm:p-8">
      <DotField className="opacity-60 mask-[radial-gradient(ellipse_70%_80%_at_20%_50%,black,transparent)]" />

      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <h2 className="font-heading text-lg font-medium">
            {hasScans ? "Ready for a scan?" : "You're out of scans"}
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {hasScans
              ? "Capture or upload a photo for personalized cosmetic guidance and product recommendations."
              : "Your allowance is used up. Pick a pack to keep scanning. Existing reports and chats stay available."}
          </p>
          {hasScans ? (
            <p className="text-xs font-medium text-primary">
              {remaining} scan{remaining === 1 ? "" : "s"} remaining
            </p>
          ) : null}
        </div>

        <Button
          asChild
          size="lg"
          variant={hasScans ? "default" : "outline"}
          className="shrink-0"
        >
          <Link href={hasScans ? "/scan" : BILLING_HREF}>
            {hasScans ? (
              <>
                <IconCamera className="size-4" />
                Start your scan
              </>
            ) : (
              <>
                <IconSparkles className="size-4" />
                View plans
              </>
            )}
          </Link>
        </Button>
      </div>
    </section>
  )
}
