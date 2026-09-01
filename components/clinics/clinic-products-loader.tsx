import { ClinicProducts } from "@/components/clinics/clinic-products"
import { requireClinicMember } from "@/lib/clinics/membership"
import { can } from "@/lib/clinics/permissions"
import { prisma } from "@/lib/db/client"
import { productOwnerFilter } from "@/lib/products/catalogue-scope"

/**
 * Both catalogues a clinic can see, read separately and labelled separately.
 *
 * Aurora's products are read with the platform filter and the clinic's own with
 * its scope, rather than one query returning a mixed list. Keeping them apart
 * here is what lets the page label every row without ever inferring ownership
 * from a field the client can see — the organization id never leaves this file.
 */

const LIST_FIELDS = {
  id: true,
  name: true,
  slug: true,
  sku: true,
  description: true,
  category: true,
  classifications: true,
  imageUrl: true,
  storeUrl: true,
  isActive: true,
  isRecommendable: true,
} as const

export async function ClinicProductsLoader() {
  const session = await requireClinicMember()

  const [aurora, mine] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true, ...productOwnerFilter(null) },
      orderBy: { name: "asc" },
      select: LIST_FIELDS,
    }),
    prisma.product.findMany({
      where: { organizationId: session.scope },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      select: LIST_FIELDS,
    }),
  ])

  return (
    <ClinicProducts
      auroraProducts={aurora}
      clinicProducts={mine}
      clinicName={session.tenant.branding.displayName}
      canManage={can(session, "PRODUCT_MANAGE")}
    />
  )
}
