import Link from "next/link"
import { IconAlertTriangle, IconX } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  buildModelHealthSummary,
  formatModelHealthIssue,
} from "@/lib/models/status"
import { listModelRates } from "@/lib/models/queries"

export async function ModelHealthBanner() {
  const models = await listModelRates()
  const summary = buildModelHealthSummary(models)

  if (!summary.hasIssues) {
    return null
  }

  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
      <IconAlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-medium">Model configuration needs attention</p>
        <ul className="space-y-0.5 text-xs">
          {summary.issues.map((issue, index) => (
            <li key={`${issue.kind}-${index}`}>
              {formatModelHealthIssue(issue)}
            </li>
          ))}
        </ul>
        <Button variant="outline" size="sm" className="mt-2 h-7" asChild>
          <Link href="/admin/models">Review models</Link>
        </Button>
      </div>
      <span className="sr-only">Dismiss</span>
      <IconX className="size-4 opacity-0" aria-hidden />
    </div>
  )
}
