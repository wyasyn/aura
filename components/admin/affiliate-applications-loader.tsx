import { AffiliateApplicationsTable } from "@/components/admin/affiliate-applications-table"
import { listAffiliateApplications } from "@/lib/admin/affiliate-queries"

export async function AffiliateApplicationsLoader() {
  const applications = await listAffiliateApplications()
  return <AffiliateApplicationsTable applications={applications} />
}
