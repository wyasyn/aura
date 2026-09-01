import type { z } from "zod"

export type FieldErrors = Record<string, string>

export type ValidationOutcome<T> =
  | { ok: true; data: T }
  | { ok: false; errors: FieldErrors; message: string }

/**
 * Runs an onboarding schema in the browser before dispatching the server
 * action, mapping issues onto per-field messages.
 *
 * Onboarding previously had no client validation at all, so every mistake cost
 * a round trip and surfaced as one shared string (often a raw ZodError JSON
 * blob). The same schemas from lib/onboarding/schemas.ts run on both sides, so
 * the server stays authoritative and the client just gets there sooner.
 */
export function validate<TSchema extends z.ZodType>(
  schema: TSchema,
  value: unknown,
): ValidationOutcome<z.infer<TSchema>> {
  const result = schema.safeParse(value)
  if (result.success) {
    return { ok: true, data: result.data }
  }

  const errors: FieldErrors = {}
  for (const issue of result.error.issues) {
    const key = issue.path.map(String).join(".") || "_"
    // First issue per field wins: later ones are usually knock-on effects.
    if (!(key in errors)) {
      errors[key] = issue.message
    }
  }

  const message =
    result.error.issues[0]?.message ?? "Please check the highlighted fields."

  return { ok: false, errors, message }
}

/**
 * Turns an unknown thrown value into copy worth showing.
 *
 * Server actions reject with plain Errors whose message is already
 * user-facing; anything else gets a neutral fallback rather than leaking an
 * internal string.
 */
export function toUserMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message && err.message.length < 200) {
    return err.message
  }
  return fallback
}
