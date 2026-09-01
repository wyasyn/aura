import { requireAdmin } from "@/lib/auth/session"
import { ModelRateEditor } from "@/components/admin/model-rate-editor"
import { listModelRates } from "@/lib/models/queries"

export async function ModelsAdminLoader() {
  // Asserted here, not left to the layout's AdminAuthGate. A layout and the
  // page beneath it render in parallel, so the gate's redirect does not stop
  // this loader running — the redirect reaches the browser, but the rows are
  // already on the wire and readable by anyone who requests the URL.
  await requireAdmin()

  const models = await listModelRates()
  return <ModelRateEditor models={models} />
}
