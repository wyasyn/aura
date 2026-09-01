/**
 * Plain module, deliberately not "use server": every export from a server-action
 * file must be an async function, so a shared constant cannot live alongside the
 * consent actions. Typecheck accepts it there; only the build rejects it.
 */

/** Bumped when the wording a patient agreed to materially changes. */
export const TRAINING_CONSENT_VERSION = "2026-08-v1"
