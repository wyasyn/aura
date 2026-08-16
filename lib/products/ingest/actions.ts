"use server"

import { revalidatePath } from "next/cache"

import { requireAdmin } from "@/lib/auth/session"
import { prisma } from "@/lib/db/client"
import {
  getCatalogSyncSourceLabel,
  syncProductCatalog,
} from "@/lib/products/ingest/sync-catalog"

export async function syncProductsFromStoreAction() {
  const session = await requireAdmin()
  const result = await syncProductCatalog(session.user.id)

  revalidatePath("/admin/products")

  return {
    ...result,
    message: `Synced ${result.total} products from ${result.source} (${result.created} created, ${result.updated} updated).`,
  }
}

export async function getCatalogSyncStatusAction() {
  await requireAdmin()
  const source = await getCatalogSyncSourceLabel()
  const count = await prisma.product.count()
  return { source, count }
}
