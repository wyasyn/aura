import { ClinicsTable } from "@/components/admin/clinics-table"
import { listClinicPlans, listClinics } from "@/lib/admin/clinic-queries"

export async function ClinicsLoader() {
  const [clinics, plans] = await Promise.all([listClinics(), listClinicPlans()])

  return (
    <ClinicsTable
      clinics={clinics}
      plans={plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        priceCents: plan.priceCents,
        interval: plan.interval,
      }))}
    />
  )
}
