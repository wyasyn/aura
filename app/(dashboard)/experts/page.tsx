import { Suspense } from "react"

import { ExpertDirectory } from "@/components/experts/expert-directory"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import type { ExpertSpecialty } from "@/generated/prisma/client"
import { EXPERT_SPECIALTIES } from "@/lib/experts/types"
import { listApprovedExperts } from "@/lib/experts/marketplace-queries"

function DirectorySkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-40 w-full rounded-xl" />
      ))}
    </div>
  )
}

function parseSpecialty(value?: string): ExpertSpecialty | undefined {
  return EXPERT_SPECIALTIES.find((s) => s === value)
}

async function ExpertDirectoryLoader({
  specialty,
}: {
  specialty?: ExpertSpecialty
}) {
  const experts = await listApprovedExperts(specialty)
  return <ExpertDirectory experts={experts} activeSpecialty={specialty} />
}

export default async function ExpertsPage({
  searchParams,
}: {
  searchParams: Promise<{ specialty?: string }>
}) {
  const params = await searchParams
  const specialty = parseSpecialty(params.specialty)

  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Talk to an expert"
        description="Book a paid video consultation with a dermatologist or Ayurvedic practitioner."
      />
      <Suspense fallback={<DirectorySkeleton />}>
        <ExpertDirectoryLoader specialty={specialty} />
      </Suspense>
    </div>
  )
}
