import Link from "next/link"

import { StatCard } from "@/components/dashboard/stat-card"
import { getClinicSummary } from "@/lib/admin/clinic-queries"
import { requireAdmin } from "@/lib/auth/session"

/**
 * Platform-wide clinic totals for the admin dashboard.
 *
 * Aggregates only. This is a count of tenants and seats, never a window into
 * any clinic's patients or scans — an admin dashboard being an admin surface is
 * not a reason to surface clinical data on it.
 */
export async function ClinicSummaryLoader() {
  await requireAdmin()

  const summary = await getClinicSummary()

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-heading text-lg font-medium">Clinics</h2>
        <Link href="/admin/clinics" className="text-sm underline underline-offset-4">
          Manage clinics
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total clinics" value={summary.total} />
        <StatCard
          label="Active"
          value={summary.active}
          hint={summary.suspended > 0 ? `${summary.suspended} suspended` : undefined}
        />
        <StatCard
          label="Paying"
          value={summary.activeSubscriptions}
          hint={summary.unplanned > 0 ? `${summary.unplanned} with no plan` : undefined}
        />
        <StatCard
          label="Clinic staff"
          value={summary.liveMemberships}
          hint="Active and invited"
        />
      </div>
    </section>
  )
}
