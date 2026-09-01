"use client"

import { CompactNumber } from "@/components/ui/compact-number"

type UsageScanSummaryProps = {
  /** Scans used on the current plan, not lifetime. */
  used: number
  granted: number
  remaining: number
}

export function UsageScanSummary({
  used,
  granted,
  remaining,
}: UsageScanSummaryProps) {
  return (
    <>
      <div>
        <h2 className="font-heading text-sm font-medium">
          Scans used on this plan
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          <CompactNumber value={used} /> of <CompactNumber value={granted} />{" "}
          granted
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        <CompactNumber value={remaining} /> remaining
      </p>
    </>
  )
}
