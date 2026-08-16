import { ProductsAdminClient } from "@/components/admin/products-admin-client"
import { listProductsAction } from "@/lib/products/actions"

export async function ProductsAdminLoader() {
  const products = await listProductsAction()
  return <ProductsAdminClient products={products} />
}
