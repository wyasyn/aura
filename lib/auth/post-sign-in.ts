"use server"

import { ensureUserRecords } from "@/lib/auth/bootstrap"
import { getPostAuthRedirect } from "@/lib/auth/post-auth-redirect"

export async function ensureUserRecordsAction(
  userId: string,
  email: string,
  name?: string | null
) {
  await ensureUserRecords(userId, email, name ?? undefined)
}

export async function completeSignInAction(
  userId: string,
  email: string,
  name?: string | null,
  callbackUrl?: string | null,
) {
  await ensureUserRecords(userId, email, name ?? undefined)
  return getPostAuthRedirect(userId, callbackUrl)
}
