/**
 * Placeholder shown while the server finishes wiring up a social sign-in.
 *
 * The completion itself is server work (see the social-complete route). Doing
 * it in a client effect meant a server action and a client navigation raced
 * each other, which could leave the browser sitting on this message after the
 * destination had already been resolved.
 */
export function SocialCompleteFallback() {
  return (
    <div className="text-muted-foreground flex min-h-svh items-center justify-center text-sm">
      Completing sign in…
    </div>
  )
}
