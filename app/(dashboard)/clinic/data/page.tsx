import { Suspense } from "react"

import { ClinicDataSharing } from "@/components/clinics/clinic-data-sharing"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { canManageClinic, requireClinicMember } from "@/lib/clinics/membership"
import { prisma } from "@/lib/db/client"

async function DataSharingLoader() {
  const session = await requireClinicMember()

  const clinic = await prisma.clinicSettings.findUniqueOrThrow({
    where: { id: session.tenant.clinicId },
    select: {
      allowTrainingContribution: true,
      trainingContributionSetAt: true,
    },
  })

  return (
    <ClinicDataSharing
      enabled={clinic.allowTrainingContribution}
      decidedAt={clinic.trainingContributionSetAt}
      canManage={canManageClinic(session.role)}
    />
  )
}

export default function ClinicDataPage() {
  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Data sharing"
        description="Whether your patients' results may help improve Aurora's analysis."
        badge="Clinic"
      />
      <Suspense fallback={<Skeleton className="h-80 w-full rounded-xl" />}>
        <DataSharingLoader />
      </Suspense>
    </div>
  )
}
