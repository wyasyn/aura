"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconMail, IconStethoscope } from "@tabler/icons-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  approveExpertApplicationAction,
  rejectExpertApplicationAction,
} from "@/lib/admin/expert-actions"
import { SPECIALTY_LABELS } from "@/lib/experts/types"
import { formatMoneyCents } from "@/lib/payments/format"

export type ExpertApplicationRow = {
  id: string
  specialty: keyof typeof SPECIALTY_LABELS
  headline: string
  bio: string
  credentials: string
  yearsExperience: number
  consultationPriceCents: number
  status: "pending" | "approved" | "rejected"
  rejectionReason: string | null
  appliedAt: Date
  user: { name: string; email: string }
}

function statusVariant(status: ExpertApplicationRow["status"]) {
  if (status === "approved") return "default" as const
  if (status === "rejected") return "destructive" as const
  return "secondary" as const
}

export function ExpertApplicationsTable({
  applications,
}: {
  applications: ExpertApplicationRow[]
}) {
  // Pending first: those are the ones needing a decision, and burying them
  // under already-reviewed applications is what makes a queue get missed.
  const pending = applications.filter((app) => app.status === "pending")
  const reviewed = applications.filter((app) => app.status !== "pending")

  if (applications.length === 0) {
    return (
      <div className="text-muted-foreground rounded-xl border border-border/60 p-6 text-sm">
        No expert applications yet.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {pending.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Awaiting review
            </p>
            <Badge variant="secondary">{pending.length}</Badge>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {pending.map((app) => (
              <ApplicationCard key={app.id} app={app} />
            ))}
          </div>
        </section>
      ) : null}

      {reviewed.length > 0 ? (
        <section className="space-y-3">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Reviewed
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            {reviewed.map((app) => (
              <ApplicationCard key={app.id} app={app} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

/**
 * One application. The rejection note lives here rather than in the parent so
 * each card keeps its own — a single shared value meant a reason typed for one
 * applicant appeared in the next one's dialog.
 */
function ApplicationCard({ app }: { app: ExpertApplicationRow }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [reason, setReason] = useState("")

  function approve() {
    startTransition(async () => {
      try {
        await approveExpertApplicationAction(app.id)
        toast.success(`${app.user.name} approved`)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Approval failed")
      }
    })
  }

  function reject() {
    startTransition(async () => {
      try {
        await rejectExpertApplicationAction({
          expertProfileId: app.id,
          reason,
        })
        toast.success("Application rejected")
        setReason("")
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Rejection failed")
      }
    })
  }

  return (
    <div className="surface-panel flex flex-col gap-4 rounded-xl border border-border/60 p-5">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{app.user.name}</p>
          <Badge variant={statusVariant(app.status)}>{app.status}</Badge>
        </div>

        <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <IconMail className="size-3.5" />
            {app.user.email}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <IconStethoscope className="size-3.5" />
            {SPECIALTY_LABELS[app.specialty]}
          </span>
        </div>
      </div>

      <p className="text-sm">{app.headline}</p>

      <dl className="grid grid-cols-3 gap-3 rounded-lg border border-border/60 p-3 text-center">
        <div>
          <dt className="text-muted-foreground text-xs">Experience</dt>
          <dd className="font-medium tabular-nums">
            {app.yearsExperience}
            <span className="text-muted-foreground text-xs"> yrs</span>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Consultation</dt>
          <dd className="font-medium tabular-nums">
            {formatMoneyCents(app.consultationPriceCents)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Applied</dt>
          <dd className="font-medium">
            {app.appliedAt.toLocaleDateString(undefined, { dateStyle: "medium" })}
          </dd>
        </div>
      </dl>

      <details className="group">
        <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-xs">
          Credentials and bio
        </summary>
        <div className="mt-2 space-y-2 text-sm">
          <p className="text-muted-foreground">{app.credentials}</p>
          <p className="text-muted-foreground">{app.bio}</p>
        </div>
      </details>

      {app.status === "rejected" && app.rejectionReason ? (
        <p className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-3 text-xs">
          {app.rejectionReason}
        </p>
      ) : null}

      {app.status === "pending" ? (
        <div className="mt-auto flex flex-wrap gap-2 border-t border-border/60 pt-4">
          <Button size="sm" disabled={pending} onClick={approve}>
            Approve
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive" disabled={pending}>
                Reject
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reject {app.user.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Optionally explain why. The applicant sees this and can
                  resubmit.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason (optional)"
                rows={3}
              />
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setReason("")}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction onClick={reject}>
                  Reject application
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ) : null}
    </div>
  )
}
