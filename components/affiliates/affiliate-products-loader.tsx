import { AffiliateProducts } from "@/components/affiliates/affiliate-products"
import { requireAffiliate } from "@/lib/auth/session"
import { getMyAffiliateProfile } from "@/lib/affiliates/queries"
import { buildShareLink } from "@/lib/affiliates/share-link"
import { prisma } from "@/lib/db/client"

export async function AffiliateProductsLoader() {
  const session = await requireAffiliate()
  const profile = await getMyAffiliateProfile(session.user.id)

  // Only the platform catalogue. A clinic's own products belong to that clinic
  // and are not the affiliate programme's to promote.
  const products = await prisma.product.findMany({
    where: { isActive: true, organizationId: null },
    orderBy: { name: "asc" },
    take: 200,
    select: {
      id: true,
      name: true,
      category: true,
      imageUrl: true,
      storeUrl: true,
    },
  })

  return (
    <AffiliateProducts
      couponCode={profile?.couponCode ?? null}
      products={products.map((product) => ({
        id: product.id,
        name: product.name,
        category: product.category,
        imageUrl: product.imageUrl,
        shareLink: buildShareLink(product.storeUrl, profile?.couponCode),
      }))}
    />
  )
}
