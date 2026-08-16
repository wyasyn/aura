import Link from "next/link"
import { IconAlertTriangle } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  formatModelHealthIssue,
  type ModelHealthSummary,
} from "@/lib/models/status"
import { SCAN_TIER_LABELS } from "@/lib/models/types"
import { cn } from "@/lib/utils"

type ModelHealthPanelProps = {
  summary: ModelHealthSummary
  className?: string
}

export function ModelHealthPanel({ summary, className }: ModelHealthPanelProps) {
  return (
    <div className={cn("surface-panel rounded-xl border border-border/60 p-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-sm font-medium">Model health</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Active tier assignments and switchable models
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/models">Open models admin</Link>
        </Button>
      </div>

      {summary.hasIssues ? (
        <ul className="mt-4 space-y-2">
          {summary.issues.map((issue, index) => (
            <li
              key={`${issue.kind}-${index}`}
              className="flex items-start gap-2 rounded-sm border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              <IconAlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{formatModelHealthIssue(issue)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          All tiers have an active assigned model.
        </p>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {summary.tiers.map((tierStatus) => (
          <div
            key={tierStatus.tier}
            className="rounded-sm border border-border bg-muted/20 p-4"
          >
            <p className="text-sm font-medium">
              {SCAN_TIER_LABELS[tierStatus.tier]}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {tierStatus.assignedModel
                ? tierStatus.assignedModel.isActive
                  ? `Active: ${tierStatus.assignedModel.displayName ?? tierStatus.assignedModel.modelId}`
                  : `Inactive: ${tierStatus.assignedModel.displayName ?? tierStatus.assignedModel.modelId}`
                : "No model assigned"}
            </p>

            <div className="mt-3 space-y-1.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Switchable models
              </p>
              <ul className="space-y-1 text-xs">
                {tierStatus.assignableModels.map((model) => (
                  <li
                    key={model.id}
                    className={cn(
                      "flex items-center justify-between gap-2",
                      model.eligible
                        ? "text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    <span className="truncate">
                      {model.displayName ?? model.modelId}
                    </span>
                    <span className="shrink-0">
                      {model.eligible
                        ? model.assignedTier === tierStatus.tier
                          ? "assigned"
                          : "available"
                        : model.blockReason}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
