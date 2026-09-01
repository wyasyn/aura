"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { StatCard } from "@/components/dashboard/stat-card"
import { Button } from "@/components/ui/button"
import { runTrainingCollectionAction } from "@/lib/admin/training-actions"

export type TrainingStats = {
  pending: number
  validated: number
  rejected: number
  withdrawn: number
  consentingPatients: number
  contributingClinics: number
  minExportSize: number
}

export function TrainingPanel({ stats }: { stats: TrainingStats }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const exportReady = stats.validated >= stats.minExportSize

  function collect() {
    startTransition(async () => {
      try {
        const summary = await runTrainingCollectionAction()
        const skipped = Object.entries(summary.skipped)
          .map(([reason, count]) => `${count} ${reason.replace(/_/g, " ")}`)
          .join(", ")

        toast.success(
          `Collected ${summary.collected} of ${summary.considered}${skipped ? ` · skipped: ${skipped}` : ""}`,
        )
        if (summary.blockedByLeakCheck > 0) {
          toast.error(
            `${summary.blockedByLeakCheck} record(s) blocked by the identifier check. Review de-identification before collecting again.`,
          )
        }
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Collection failed")
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Awaiting expert review" value={stats.pending} />
        <StatCard
          label="Validated"
          value={stats.validated}
          hint={
            exportReady
              ? "Ready to export"
              : `${stats.minExportSize - stats.validated} more needed to export`
          }
        />
        <StatCard label="Excluded by experts" value={stats.rejected} />
        <StatCard
          label="Withdrawn"
          value={stats.withdrawn}
          hint="Consent revoked or retention expired"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Patients sharing" value={stats.consentingPatients} />
        <StatCard label="Clinics contributing" value={stats.contributingClinics} />
      </div>

      <div className="surface-panel space-y-3 rounded-xl border border-border/60 p-5">
        <p className="font-medium">Collect eligible scans</p>
        <p className="text-muted-foreground text-sm">
          Sweeps completed scans whose patient has consented — and, for clinic
          scans, whose clinic has opted in — de-identifies them, and queues them
          for expert review. Consent is re-checked at collection time, so anyone
          who has since withdrawn is skipped.
        </p>
        <Button disabled={pending} onClick={collect}>
          {pending ? "Collecting…" : "Run collection"}
        </Button>
      </div>

      <div className="surface-panel space-y-3 rounded-xl border border-border/60 p-5">
        <p className="font-medium">Export dataset</p>
        <p className="text-muted-foreground text-sm">
          Only expert-validated records are included. Exports below{" "}
          {stats.minExportSize} records are refused, because a set that small is
          re-identifiable. Every download is recorded in the audit log.
        </p>
        {exportReady ? (
          <Button asChild variant="outline">
            <a href="/api/admin/training/export">Download JSON</a>
          </Button>
        ) : (
          <Button variant="outline" disabled>
            Not enough validated records
          </Button>
        )}
      </div>
    </div>
  )
}
