"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconExternalLink, IconMail } from "@tabler/icons-react"

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
  approveAffiliateApplicationAction,
  rejectAffiliateApplicationAction,
} from "@/lib/admin/affiliate-actions"

export type AffiliateApplicationRow = {
  id: string
  howTheyPromote: string
  website: string | null
  status: "pending" | "approved" | "rejected"
  rejectionReason: string | null
  couponCode: string | null
  appliedAt: Date
  user: { name: string; email: string }
}

function statusVariant(status: AffiliateApplicationRow["status"]) {
  if (status === "approved") return "default" as const
  if (status === "rejected") return "destructive" as const
  return "secondary" as const
}

export function AffiliateApplicationsTable({
  applications,
}: {
  applications: AffiliateApplicationRow[]
}) {
  // Pending first, for the same reason as the expert queue: decisions should
  // not sit below already-reviewed rows.
  const pending = applications.filter((app) => app.status === "pending")
  const reviewed = applications.filter((app) => app.status !== "pending")

  if (applications.length === 0) {
    return (
      <div className="text-muted-foreground rounded-xl border border-border/60 p-6 text-sm">
        No affiliate applications yet.
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
 * One application. Rejection notes are per-card state: shared state meant a
 * reason typed for one applicant showed up in the next one's dialog.
 */
function ApplicationCard({ app }: { app: AffiliateApplicationRow }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [reason, setReason] = useState("")

  function approve() {
    startTransition(async () => {
      try {
        await approveAffiliateApplicationAction(app.id)
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
        await rejectAffiliateApplicationAction({
          affiliateProfileId: app.id,
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
          {app.couponCode ? (
            <Badge variant="outline">{app.couponCode}</Badge>
          ) : null}
        </div>

        <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <IconMail className="size-3.5" />
            {app.user.email}
          </span>
          <span>
            Applied{" "}
            {app.appliedAt.toLocaleDateString(undefined, { dateStyle: "medium" })}
          </span>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-muted-foreground text-xs">How they promote</p>
        <p className="text-sm">{app.howTheyPromote}</p>
      </div>

      {app.website ? (
        <a
          href={app.website}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary inline-flex items-center gap-1 text-sm underline"
        >
          {app.website.replace(/^https?:\/\//, "")}
          <IconExternalLink className="size-3.5" />
        </a>
      ) : null}

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
                  Optionally explain why, shown to the applicant so they can
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
