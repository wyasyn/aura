import { TrainingPanel } from "@/components/admin/training-panel"
import { requireAdmin } from "@/lib/auth/session"
import { MIN_EXPORT_SIZE } from "@/lib/training/export"
import { prisma } from "@/lib/db/client"

export async function TrainingPanelLoader() {
  await requireAdmin()

  const [pending, validated, rejected, withdrawn, consenting, clinics] =
    await Promise.all([
      prisma.trainingRecord.count({ where: { status: "pending_validation" } }),
      prisma.trainingRecord.count({ where: { status: "validated" } }),
      prisma.trainingRecord.count({ where: { status: "rejected" } }),
      prisma.trainingRecord.count({ where: { status: "withdrawn" } }),
      prisma.userProfile.count({ where: { trainingConsent: true } }),
      prisma.clinicSettings.count({ where: { allowTrainingContribution: true } }),
    ])

  return (
    <TrainingPanel
      stats={{
        pending,
        validated,
        rejected,
        withdrawn,
        consentingPatients: consenting,
        contributingClinics: clinics,
        minExportSize: MIN_EXPORT_SIZE,
      }}
    />
  )
}
