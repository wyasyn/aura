/** Detect Better Auth session cookie without a database round-trip. */
export function hasAuthSessionCookie(headers: Headers): boolean {
  const cookie = headers.get("cookie") ?? ""
  return /(?:^|;\s*)(?:__Secure-)?better-auth\.session_token=/.test(cookie)
}
