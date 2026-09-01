/**
 * Plain module: a "use server" file may only export async functions, so these
 * constants cannot live beside the action that uses them.
 */

export const WORKSPACE_COOKIE = "aurora-workspace"

/**
 * A display preference, not a credential. Readable by the client is harmless —
 * it decides which navigation renders, never what the holder may do.
 */
export const WORKSPACE_COOKIE_OPTIONS = {
  httpOnly: false,
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
  secure: process.env.NODE_ENV === "production",
} as const
