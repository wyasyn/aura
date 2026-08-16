import { ModelRateEditor } from "@/components/admin/model-rate-editor"
import { listModelRates } from "@/lib/models/queries"

export async function ModelsAdminLoader() {
  const models = await listModelRates()
  return <ModelRateEditor models={models} />
}
