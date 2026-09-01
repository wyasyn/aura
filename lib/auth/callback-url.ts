export const DEFAULT_POST_ONBOARDING_PATH = "/scan"

export function safeCallbackPath(
  callbackUrl: string | null | undefined,
  fallback = "/onboarding",
) {
  if (!callbackUrl || callbackUrl === "/onboarding") {
    return fallback
  }
  if (!callbackUrl.startsWith("/") || callbackUrl.startsWith("//")) {
    return fallback
  }
  return callbackUrl
}
