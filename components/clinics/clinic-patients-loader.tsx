import { StatCard } from "@/components/dashboard/stat-card"
import { Badge } from "@/components/ui/badge"
import { requireClinicMember } from "@/lib/clinics/membership"
import { listPatientsForCurrentTenant } from "@/lib/clinics/tenant-records"
import { listScansForCurrentTenant } from "@/lib/scan/tenant-scans"
import { formatLimit } from "@/lib/clinics/plan-limits"

export async function ClinicPatientsLoader() {
  const session = await requireClinicMember()
  const { tenant } = session
  // Permission check, tenant-scoped query and audit all happen in here —
  // see lib/scan/tenant-scans.ts, the reference pattern for tenant reads.
  // Registered patients and their scans are different questions. The list
  // below used to be scans alone, so a patient who had registered with the
  // clinic but not yet scanned did not appear to their own clinic at all.
  const [patients, scans] = await Promise.all([
    listPatientsForCurrentTenant(),
    listScansForCurrentTenant(),
  ])

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Scans this period"
          value={
            tenant.quota.limit === null
              ? String(tenant.quota.used)
              : `${tenant.quota.used} / ${tenant.quota.limit}`
          }
          hint={tenant.quota.limit === null ? "Unlimited plan" : undefined}
        />
        <StatCard label="Plan" value={tenant.plan?.name ?? "No plan"} />
        <StatCard
          label="Seats"
          value={tenant.plan ? formatLimit(tenant.plan.seatLimit) : "—"}
        />
      </div>

      {tenant.quota.exhausted ? (
        <div className="border-destructive/30 bg-destructive/5 rounded-xl border p-4 text-sm">
          This clinic has used its scan allowance for the current period. New
          patient scans will be blocked until the period resets or the plan is
          upgraded.
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-heading text-lg font-medium">Registered patients</h2>
          <p className="text-muted-foreground text-sm">{patients.length} total</p>
        </div>
        {patients.length === 0 ? (
          <div className="text-muted-foreground rounded-xl border border-border/60 p-6 text-sm">
            No patients yet. People who register on your clinic&apos;s site appear here.
          </div>
        ) : (
          <ul className="divide-border divide-y rounded-xl border border-border/60">
            {patients.map((patient) => (
              <li key={patient.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="space-y-1">
                  <p className="font-medium">{patient.name}</p>
                  <p className="text-muted-foreground text-sm">{patient.email}</p>
                  <p className="text-muted-foreground text-xs">
                    Joined{" "}
                    {patient.joinedAt.toLocaleDateString(undefined, { dateStyle: "medium" })}
                  </p>
                </div>
                <Badge variant="outline">
                  {patient.scanCount} {patient.scanCount === 1 ? "scan" : "scans"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="font-heading text-lg font-medium">Recent scan activity</h2>
      {scans.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-border/60 p-6 text-sm">
          No patient scans yet. Scans taken on your clinic&apos;s site appear
          here.
        </div>
      ) : (
        <ul className="divide-border divide-y rounded-xl border border-border/60">
          {scans.map((scan) => (
            <li
              key={scan.id}
              className="flex flex-wrap items-center justify-between gap-4 p-5"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{scan.patientName}</p>
                  <Badge variant={scan.status === "completed" ? "default" : "secondary"}>
                    {scan.status}
                  </Badge>
                  {scan.overallBand ? (
                    <Badge variant="outline">{scan.overallBand}</Badge>
                  ) : null}
                </div>
                <p className="text-muted-foreground text-sm">{scan.patientEmail}</p>
                <p className="text-muted-foreground text-xs">
                  {scan.createdAt.toLocaleDateString(undefined, {
                    dateStyle: "medium",
                  })}{" "}
                  · {scan.captureMode}
                </p>
              </div>
              {scan.hasReport ? (
                <Badge variant="outline">Report available</Badge>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      </div>
    </div>
  )
}
