"use server"

import { revalidatePath } from "next/cache"

import { requireSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/client"
import { scanFeedbackInputSchema } from "@/lib/scan/feedback-schema"

export type SubmitScanFeedbackResult =
  | { ok: true }
  | { ok: false; error: string }

export async function submitScanFeedbackAction(
  input: unknown,
): Promise<SubmitScanFeedbackResult> {
  const session = await requireSession()
  const parsed = scanFeedbackInputSchema.safeParse(input)

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid feedback",
    }
  }

  const scan = await prisma.scan.findFirst({
    where: {
      id: parsed.data.scanId,
      userId: session.user.id,
      status: "completed",
    },
    select: { id: true },
  })

  if (!scan) {
    return { ok: false, error: "Scan not found or not yet complete." }
  }

  const message = parsed.data.message?.trim() || null

  await prisma.scanFeedback.upsert({
    where: { scanId: scan.id },
    create: {
      scanId: scan.id,
      userId: session.user.id,
      rating: parsed.data.rating,
      message,
    },
    update: {
      rating: parsed.data.rating,
      message,
    },
  })

  revalidatePath("/reports")
  revalidatePath("/admin/feedback")

  return { ok: true }
}
