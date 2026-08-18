import { ClinicCreateForm } from "@/components/admin/clinic-create-form"
import { listClinicPlans } from "@/lib/admin/clinic-queries"

export async function ClinicCreateLoader() {
  const plans = await listClinicPlans()

  return (
    <ClinicCreateForm
      plans={plans.map((plan) => ({ id: plan.id, name: plan.name }))}
    />
  )
}
