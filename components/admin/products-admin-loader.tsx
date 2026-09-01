import { requireAdmin } from "@/lib/auth/session"
import { ProductsAdminClient } from "@/components/admin/products-admin-client"
import { listProductsAction } from "@/lib/products/actions"
import { loadCatalogueQuality } from "@/lib/products/catalogue-health"

export async function ProductsAdminLoader() {
  // Asserted here, not left to the layout's AdminAuthGate. A layout and the
  // page beneath it render in parallel, so the gate's redirect does not stop
  // this loader running — the redirect reaches the browser, but the rows are
  // already on the wire and readable by anyone who requests the URL.
  await requireAdmin()

  const [products, { rows, health }] = await Promise.all([
    listProductsAction(),
    loadCatalogueQuality(),
  ])

  return <ProductsAdminClient products={products} rows={rows} health={health} />
}
