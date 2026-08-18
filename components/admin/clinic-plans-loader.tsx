import { ClinicPlansEditor } from "@/components/admin/clinic-plans-editor"
import { listClinicPlans } from "@/lib/admin/clinic-queries"

export async function ClinicPlansLoader() {
  const plans = await listClinicPlans()
  return <ClinicPlansEditor plans={plans} />
}
