import { requireAdmin } from "@/lib/auth/session"
import { ClinicCreateForm } from "@/components/admin/clinic-create-form"
import { listClinicPlans } from "@/lib/admin/clinic-queries"

export async function ClinicCreateLoader() {
  // Asserted here, not left to the layout's AdminAuthGate. A layout and the
  // page beneath it render in parallel, so the gate's redirect does not stop
  // this loader running — the redirect reaches the browser, but the rows are
  // already on the wire and readable by anyone who requests the URL.
  await requireAdmin()

  const plans = await listClinicPlans()

  return (
    <ClinicCreateForm
      plans={plans.map((plan) => ({ id: plan.id, name: plan.name }))}
    />
  )
}
