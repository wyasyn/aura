import { ExpertApplicationsTable } from "@/components/admin/expert-applications-table"
import { listExpertApplications } from "@/lib/admin/expert-queries"

export async function ExpertApplicationsLoader() {
  const applications = await listExpertApplications()
  return <ExpertApplicationsTable applications={applications} />
}
