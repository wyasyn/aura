import { z } from "zod"

const productFields = {
  sku: z.string().max(64).optional(),
  slug: z.string().max(200).optional(),
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().min(1, "Summary is required").max(5000),
  category: z.string().min(1, "Product type is required").max(120),
  ingredients: z.string().max(5000).optional(),
  targetConcerns: z.array(z.string()).default([]),
  suitableSkinTypes: z.array(z.string()).default([]),
  climateTags: z.array(z.string()).default([]),
  imageUrl: z.string().url().optional().or(z.literal("")),
  storeUrl: z.string().url().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
}

/** What the admin UI submits — sku/slug optional (auto-generated on save). */
export const productFormSchema = z.object(productFields)

/** Full persisted shape after server normalization. */
export const productSchema = z.object({
  sku: z.string().min(1).max(64),
  slug: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  category: z.string().min(1).max(120),
  ingredients: z.string().max(5000).optional(),
  targetConcerns: z.array(z.string()).default([]),
  suitableSkinTypes: z.array(z.string()).default([]),
  climateTags: z.array(z.string()).default([]),
  imageUrl: z.string().url().optional().or(z.literal("")),
  storeUrl: z.string().url().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
})

export type ProductFormInput = z.infer<typeof productFormSchema>
export type ProductInput = z.infer<typeof productSchema>
