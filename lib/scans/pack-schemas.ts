import { z } from "zod"

import { SCAN_TIERS } from "@/lib/models/types"

export const scanPackFormSchema = z.object({
  tier: z.enum(SCAN_TIERS),
  label: z.string().trim().min(1, "Label is required").max(120),
  scanCount: z.number().int().positive("Must be at least 1 scan"),
  priceCents: z.number().int().nonnegative(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
})

export type ScanPackFormInput = z.infer<typeof scanPackFormSchema>
