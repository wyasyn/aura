import { requireAdmin } from "@/lib/auth/session"
import { ClinicPlansEditor } from "@/components/admin/clinic-plans-editor"
import { listClinicPlans } from "@/lib/admin/clinic-queries"

export async function ClinicPlansLoader() {
  // Asserted here, not left to the layout's AdminAuthGate. A layout and the
  // page beneath it render in parallel, so the gate's redirect does not stop
  // this loader running — the redirect reaches the browser, but the rows are
  // already on the wire and readable by anyone who requests the URL.
  await requireAdmin()

  const plans = await listClinicPlans()
  return <ClinicPlansEditor plans={plans} />
}
