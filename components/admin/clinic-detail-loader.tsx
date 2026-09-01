import Link from "next/link"
import { notFound } from "next/navigation"

import { AdminClinicMembers } from "@/components/admin/clinic-members"
import { StatCard } from "@/components/dashboard/stat-card"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Badge } from "@/components/ui/badge"
import { listAuditEvents } from "@/lib/admin/audit-queries"
import {
  getClinicDetail,
  getClinicMembershipCounts,
  listClinicMembersForAdmin,
} from "@/lib/admin/clinic-queries"
import { requireAdmin } from "@/lib/auth/session"
import { clinicUrl } from "@/lib/clinics/subdomain"
import { requestOrigin } from "@/lib/clinics/request-origin"
import { formatLimit } from "@/lib/clinics/plan-limits"
import { formatMoneyCents } from "@/lib/payments/format"

const RESULT_VARIANT = {
  success: "outline",
  denied: "destructive",
  failure: "secondary",
} as const

export async function ClinicDetailLoader({
  organizationId,
}: {
  organizationId: string
}) {
  // Authorized before the id from the URL is used for anything. A layout and
  // the page beneath it render in parallel, so the gate above does not stop
  // this loader on its own.
  await requireAdmin()

  const clinic = await getClinicDetail(organizationId)
  // Unknown and unauthorized look the same from outside, so an identifier
  // cannot be probed for existence.
  if (!clinic) notFound()

  const [counts, members, audit, origin] = await Promise.all([
    getClinicMembershipCounts(organizationId),
    listClinicMembersForAdmin(organizationId),
    listAuditEvents({ organizationId }),
    requestOrigin(),
  ])

  const seatLimit = clinic.plan?.seatLimit ?? null

  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title={clinic.displayName}
        description={`Platform control plane for ${clinic.name}.`}
        badge="Admin"
      />

      <div className="surface-panel space-y-3 rounded-xl border border-border/60 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={clinic.status === "active" ? "default" : "destructive"}>
            {clinic.status}
          </Badge>
          <Badge variant="outline">{clinic.subscriptionStatus || "no subscription"}</Badge>
          {clinic.access.ok ? null : (
            <Badge variant="destructive">site dark</Badge>
          )}
          {clinic.allowTrainingContribution ? (
            <Badge variant="outline">contributes training data</Badge>
          ) : null}
        </div>

        <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          <div className="flex gap-2">
            <dt className="text-muted-foreground w-32 shrink-0">Subdomain</dt>
            <dd>
              <Link
                href={clinicUrl(clinic.subdomain, "/", origin)}
                className="underline underline-offset-4"
              >
                {clinic.subdomain}
              </Link>
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground w-32 shrink-0">Custom domain</dt>
            <dd>
              {clinic.customDomain
                ? `${clinic.customDomain}${clinic.customDomainVerified ? "" : " (unverified)"}`
                : "—"}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground w-32 shrink-0">Organization</dt>
            <dd className="font-mono text-xs break-all">{clinic.organizationId}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground w-32 shrink-0">Created</dt>
            <dd>{clinic.createdAt.toLocaleDateString(undefined, { dateStyle: "medium" })}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground w-32 shrink-0">Plan</dt>
            <dd>
              {clinic.plan
                ? `${clinic.plan.name} · ${formatMoneyCents(clinic.plan.priceCents, clinic.plan.currency)}/${clinic.plan.interval}`
                : "No plan assigned"}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground w-32 shrink-0">Period ends</dt>
            <dd>
              {clinic.currentPeriodEnd
                ? clinic.currentPeriodEnd.toLocaleDateString(undefined, { dateStyle: "medium" })
                : "—"}
              {clinic.cancelAtPeriodEnd ? " (cancelling)" : ""}
            </dd>
          </div>
        </dl>
      </div>

      {/* Counts, never records. An administrator needs to know a clinic has 400
          patients, not who they are. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Seats used"
          value={seatLimit === null ? String(counts.seatsUsed) : `${counts.seatsUsed} / ${formatLimit(seatLimit)}`}
          hint="Active and invited"
        />
        <StatCard label="Patients" value={clinic.counts.patients} />
        <StatCard label="Scans" value={clinic.counts.scans} />
        <StatCard label="Appointments" value={clinic.counts.appointments} />
      </div>

      <AdminClinicMembers
        organizationId={organizationId}
        members={members}
        counts={counts}
      />

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-heading text-lg font-medium">Recent activity</h2>
          <Link
            href={`/admin/audit?organizationId=${organizationId}`}
            className="text-sm underline underline-offset-4"
          >
            Full audit log
          </Link>
        </div>

        {audit.events.length === 0 ? (
          <div className="text-muted-foreground rounded-xl border border-border/60 p-6 text-sm">
            No audit events recorded for this clinic yet.
          </div>
        ) : (
          <ul className="divide-border divide-y rounded-xl border border-border/60">
            {audit.events.slice(0, 10).map((event) => (
              <li key={event.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-4 text-sm">
                <code className="font-medium">{event.action}</code>
                <Badge variant={RESULT_VARIANT[event.result]}>{event.result}</Badge>
                <span className="text-muted-foreground">
                  {event.actor?.name ?? event.actor?.email ?? "system"}
                  {" · "}
                  {event.createdAt.toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
