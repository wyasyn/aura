"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

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
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [reason, setReason] = useState("")

  function approve(id: string) {
    startTransition(async () => {
      try {
        await approveAffiliateApplicationAction(id)
        toast.success("Affiliate approved and coupon created")
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Approval failed")
      }
    })
  }

  function reject(id: string) {
    startTransition(async () => {
      try {
        await rejectAffiliateApplicationAction({ affiliateProfileId: id, reason })
        toast.success("Application rejected")
        setReason("")
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Rejection failed")
      }
    })
  }

  if (applications.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 p-6 text-sm text-muted-foreground">
        No affiliate applications yet.
      </div>
    )
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border/60">
      {applications.map((app) => (
        <li key={app.id} className="space-y-3 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{app.user.name}</p>
                <Badge variant={statusVariant(app.status)}>{app.status}</Badge>
                {app.couponCode ? (
                  <Badge variant="outline">{app.couponCode}</Badge>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground">{app.user.email}</p>
            </div>
            {app.website ? (
              <a
                href={app.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary underline"
              >
                {app.website}
              </a>
            ) : null}
          </div>

          <p className="text-sm text-muted-foreground">{app.howTheyPromote}</p>

          {app.status === "rejected" && app.rejectionReason ? (
            <p className="text-xs text-destructive">
              Rejected: {app.rejectionReason}
            </p>
          ) : null}

          {app.status === "pending" ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={pending} onClick={() => approve(app.id)}>
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
                    <AlertDialogAction onClick={() => reject(app.id)}>
                      Reject application
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
