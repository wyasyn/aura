"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconExternalLink } from "@tabler/icons-react"

import { useState } from "react"

import { ClinicDeleteDialog } from "@/components/admin/clinic-delete-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  setClinicCompAccessAction,
  setClinicPlanAction,
  setClinicStatusAction,
} from "@/lib/admin/clinic-actions"
import type { AdminClinicRow } from "@/lib/admin/clinic-queries"

import { describeSubscriptionStatus } from "@/lib/clinics/subscription"
import { formatMoneyCents } from "@/lib/payments/format"

type PlanOption = { id: string; name: string; priceCents: number; interval: string }

/** The public URL is built server-side, where the request host is available. */
type ClinicRow = AdminClinicRow & { url: string }

export function ClinicsTable({
  clinics,
  plans,
}: {
  clinics: ClinicRow[]
  plans: PlanOption[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [deleting, setDeleting] = useState<ClinicRow | null>(null)

  function run(work: () => Promise<unknown>, success: string) {
    startTransition(async () => {
      try {
        await work()
        toast.success(success)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Action failed")
      }
    })
  }

  if (clinics.length === 0) {
    return (
      <div className="text-muted-foreground rounded-xl border border-border/60 p-6 text-sm">
        No clinics provisioned yet. Use the “Add clinic” tab to create one.
      </div>
    )
  }

  return (
    <ul className="divide-border divide-y rounded-xl border border-border/60">
      {clinics.map((clinic) => {
        const url = clinic.url
        const comped = !clinic.stripeSubscriptionId

        return (
          <li key={clinic.id} className="space-y-3 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{clinic.name}</p>
                  <Badge
                    variant={clinic.status === "active" ? "default" : "destructive"}
                  >
                    {clinic.status}
                  </Badge>
                  <Badge variant={clinic.access.ok ? "default" : "secondary"}>
                    {describeSubscriptionStatus(clinic.subscriptionStatus)}
                  </Badge>
                  {comped && clinic.subscriptionStatus === "active" ? (
                    <Badge variant="outline">comped</Badge>
                  ) : null}
                </div>

                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary inline-flex items-center gap-1 text-sm underline"
                >
                  {url.replace(/^https?:\/\//, "")}
                  <IconExternalLink className="size-3.5" />
                </a>

                <p className="text-muted-foreground text-xs">
                  {clinic.memberCount} member{clinic.memberCount === 1 ? "" : "s"}
                  {clinic.plan ? ` of ${clinic.plan.seatLimit} seats` : " · no plan"} ·{" "}
                  {clinic.quota.limit === null
                    ? `${clinic.quota.used} scans this period (unlimited)`
                    : `${clinic.quota.used} / ${clinic.quota.limit} scans this period`}{" "}
                  · {clinic.totalScanCount} all time
                </p>

                {!clinic.access.ok ? (
                  <p className="text-muted-foreground text-xs">
                    Site is dark:{" "}
                    {clinic.access.reason === "suspended"
                      ? "suspended by an admin"
                      : "no active subscription"}
                    .
                  </p>
                ) : clinic.access.grace ? (
                  <p className="text-destructive text-xs">
                    Payment past due — still serving, but Stripe is retrying the
                    invoice.
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label={`Plan for ${clinic.name}`}
                  value={clinic.plan?.id ?? ""}
                  disabled={pending}
                  onChange={(e) =>
                    run(
                      () =>
                        setClinicPlanAction({
                          clinicId: clinic.id,
                          planId: e.target.value || null,
                        }),
                      "Plan updated",
                    )
                  }
                  className="border-input bg-background h-9 rounded-md border px-2 text-sm"
                >
                  <option value="">No plan</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} · {formatMoneyCents(plan.priceCents)}/{plan.interval}
                    </option>
                  ))}
                </select>

                {comped ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      run(
                        () =>
                          setClinicCompAccessAction({
                            clinicId: clinic.id,
                            comped: clinic.subscriptionStatus !== "active",
                          }),
                        clinic.subscriptionStatus === "active"
                          ? "Comped access revoked"
                          : "Comped access granted",
                      )
                    }
                  >
                    {clinic.subscriptionStatus === "active"
                      ? "Revoke comp"
                      : "Comp access"}
                  </Button>
                ) : null}

                <Button
                  size="sm"
                  variant={clinic.status === "active" ? "destructive" : "default"}
                  disabled={pending}
                  onClick={() =>
                    run(
                      () =>
                        setClinicStatusAction({
                          clinicId: clinic.id,
                          status: clinic.status === "active" ? "suspended" : "active",
                        }),
                      clinic.status === "active"
                        ? "Clinic suspended"
                        : "Clinic reactivated",
                    )
                  }
                >
                  {clinic.status === "active" ? "Suspend" : "Reactivate"}
                </Button>

                <Button asChild size="sm" variant="outline">
                  <a href={`/admin/clinics/${clinic.organizationId}`}>Details</a>
                </Button>

                <Button asChild size="sm" variant="outline">
                  <a href={`/api/admin/clinics/${clinic.id}/export`}>Export</a>
                </Button>

                <Button
                  size="sm"
                  variant="destructive"
                  disabled={pending}
                  onClick={() => setDeleting(clinic)}
                >
                  Delete
                </Button>
              </div>
            </div>
          </li>
        )
      })}

      {deleting ? (
        <ClinicDeleteDialog
          clinicId={deleting.id}
          clinicName={deleting.name}
          open={Boolean(deleting)}
          onOpenChange={(open) => {
            if (!open) setDeleting(null)
          }}
        />
      ) : null}
    </ul>
  )
}
