"use server"

import { revalidatePath } from "next/cache"

import { requireAdmin } from "@/lib/auth/session"
import { prisma } from "@/lib/db/client"
import { scanPackFormSchema } from "@/lib/scans/pack-schemas"

function revalidateScanPacks() {
  revalidatePath("/admin/scan-packs")
  revalidatePath("/dashboard/billing")
}

export async function createScanPackAction(input: unknown) {
  await requireAdmin()
  const data = scanPackFormSchema.parse(input)

  const pack = await prisma.scanPack.create({ data })

  revalidateScanPacks()
  return pack
}

export async function updateScanPackAction(id: string, input: unknown) {
  await requireAdmin()
  const data = scanPackFormSchema.parse(input)

  const pack = await prisma.scanPack.update({ where: { id }, data })

  revalidateScanPacks()
  return pack
}
