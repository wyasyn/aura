"use server"

import { revalidatePath } from "next/cache"

import { revalidateCatalogContext } from "@/lib/ai/context/cache-tags"
import { requireAdmin } from "@/lib/auth/session"
import { prisma } from "@/lib/db/client"
import { normalizeProductInput } from "@/lib/products/normalize"
import { productFormSchema, productSchema } from "@/lib/products/schemas"

export async function listProductsAction() {
  await requireAdmin()
  return prisma.product.findMany({
    orderBy: { createdAt: "desc" },
  })
}

export async function createProductAction(input: unknown) {
  const session = await requireAdmin()
  const form = productFormSchema.parse(input)
  const normalized = normalizeProductInput(form)
  const data = productSchema.parse(normalized)

  const product = await prisma.product.create({
    data: {
      ...data,
      ingredients: data.ingredients || null,
      ingredientList: normalized.ingredientList,
      imageUrl: data.imageUrl || null,
      storeUrl: data.storeUrl || null,
      createdById: session.user.id,
    },
  })

  revalidatePath("/admin")
  revalidatePath("/admin/products")
  revalidateCatalogContext()
  return product
}

export async function updateProductAction(id: string, input: unknown) {
  await requireAdmin()
  const form = productFormSchema.parse(input)

  const existing = await prisma.product.findUnique({
    where: { id },
    select: { sku: true, slug: true },
  })
  if (!existing) {
    throw new Error("Product not found")
  }

  const normalized = normalizeProductInput(form, {
    existingSku: existing.sku,
    existingSlug: existing.slug,
  })
  const data = productSchema.parse(normalized)

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...data,
      ingredients: data.ingredients || null,
      ingredientList: normalized.ingredientList,
      imageUrl: data.imageUrl || null,
      storeUrl: data.storeUrl || null,
    },
  })

  revalidatePath("/admin")
  revalidatePath("/admin/products")
  revalidateCatalogContext()
  return product
}

export async function deleteProductAction(id: string) {
  await requireAdmin()
  await prisma.product.delete({ where: { id } })
  revalidatePath("/admin")
  revalidatePath("/admin/products")
  revalidateCatalogContext()
}
