import { Suspense } from "react"
import type { Metadata } from "next"

import { tenantMetadata } from "@/lib/clinics/metadata"
import { ReportsList } from "@/components/dashboard/reports-list"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { ReportsListSkeleton } from "@/components/dashboard/skeletons/reports-list-skeleton"

type ReportsPageProps = {
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  return tenantMetadata("Your reports")
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const params = await searchParams
  const page = params.page ? Number.parseInt(params.page, 10) : 1

  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Scans"
        description="Your scan history with dimension profiles and downloadable PDF reports."
      />

      <Suspense fallback={<ReportsListSkeleton />}>
        <ReportsList page={page} />
      </Suspense>
    </div>
  )
}
