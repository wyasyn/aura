"use server"

import { cookies } from "next/headers"
import { z } from "zod"

import { requireAuthContext } from "@/lib/auth/context"
import { WORKSPACE_COOKIE, WORKSPACE_COOKIE_OPTIONS } from "@/lib/dashboard/workspace-cookie"
import { availableWorkspaces } from "@/lib/dashboard/nav"
import { getWorkspaceCapabilities } from "@/lib/dashboard/capabilities"

const schema = z.object({ workspaceId: z.string().trim().min(1) })

/**
 * Remembers which persona the user last worked in.
 *
 * The value is validated against what the caller may actually use, so a
 * hand-set cookie cannot persist a workspace they do not hold. It would grant
 * nothing even if it did — every route guards itself — but storing a value the
 * server would reject makes later behaviour harder to reason about.
 */
export async function setWorkspaceAction(input: unknown) {
  const ctx = await requireAuthContext()
  const { workspaceId } = schema.parse(input)

  const capabilities = await getWorkspaceCapabilities(ctx.userId, ctx.user.role ?? null)
  const allowed = availableWorkspaces(capabilities).some((w) => w.id === workspaceId)
  if (!allowed) {
    throw new Error("That workspace is not available to you.")
  }

  const cookieStore = await cookies()
  cookieStore.set(WORKSPACE_COOKIE, workspaceId, WORKSPACE_COOKIE_OPTIONS)

  return { workspaceId }
}
