import { requireAdmin } from "@/lib/auth/session"
import { ExpertApplicationsTable } from "@/components/admin/expert-applications-table"
import { listExpertApplications } from "@/lib/admin/expert-queries"

export async function ExpertApplicationsLoader() {
  // Asserted here, not left to the layout's AdminAuthGate. A layout and the
  // page beneath it render in parallel, so the gate's redirect does not stop
  // this loader running — the redirect reaches the browser, but the rows are
  // already on the wire and readable by anyone who requests the URL.
  await requireAdmin()

  const applications = await listExpertApplications()
  return <ExpertApplicationsTable applications={applications} />
}
