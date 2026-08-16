"use server"

import { z } from "zod"

import { getSession } from "@/lib/auth/session"
import { sendDeletionRequestEmail } from "@/lib/email/send-deletion-request"

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  message: z.string().max(2000).optional(),
})

export type DeletionRequestState = {
  ok: boolean
  error?: string
}

export async function submitDeletionRequestAction(
  _prev: DeletionRequestState,
  formData: FormData,
): Promise<DeletionRequestState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    message: formData.get("message") || undefined,
  })

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid form data",
    }
  }

  const session = await getSession()

  try {
    await sendDeletionRequestEmail({
      email: parsed.data.email,
      message: parsed.data.message,
      userId: session?.user.id,
    })
    return { ok: true }
  } catch {
    return {
      ok: false,
      error: "Could not send your request. Please try again or email us directly.",
    }
  }
}
