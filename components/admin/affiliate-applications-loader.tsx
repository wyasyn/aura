import { requireAdmin } from "@/lib/auth/session"
import { AffiliateApplicationsTable } from "@/components/admin/affiliate-applications-table"
import { listAffiliateApplications } from "@/lib/admin/affiliate-queries"

export async function AffiliateApplicationsLoader() {
  // Asserted here, not left to the layout's AdminAuthGate. A layout and the
  // page beneath it render in parallel, so the gate's redirect does not stop
  // this loader running — the redirect reaches the browser, but the rows are
  // already on the wire and readable by anyone who requests the URL.
  await requireAdmin()

  const applications = await listAffiliateApplications()
  return <AffiliateApplicationsTable applications={applications} />
}
