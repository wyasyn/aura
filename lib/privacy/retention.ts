/**
 * Data retention schedule.
 *
 * Single source of truth: the purge cron enforces these windows and the privacy
 * policy cites the same numbers, so the published policy cannot drift from what
 * the code actually does.
 *
 * Scan photos are absent from this list on purpose. They are never written to
 * storage at all: `Scan.imageRetained` is hardcoded false and the bytes are
 * discarded once the model has returned.
 */
export const RETENTION = {
  /**
   * Photos attached to advice-chat messages. These were previously kept
   * indefinitely, which contradicted the policy's "we do not retain photos".
   * The transcript survives; only the image bytes are cleared.
   */
  chatImageDays: 30,

  /** Expired auth sessions, including the IP and user-agent recorded on them. */
  expiredSessionDays: 7,

  /** Consumed or expired OTP and verification rows. */
  verificationDays: 7,

  /**
   * Per-call model spend logs. Kept long enough for billing reconciliation and
   * abuse investigation, then dropped.
   */
  aiUsageDays: 400,
} as const

export type RetentionKey = keyof typeof RETENTION

export function cutoffDate(days: number, now: Date = new Date()): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
}
