import type { AuditResult, PrismaClient } from "@/generated/prisma/client"
import { prisma } from "@/lib/db/client"

/**
 * Append-only audit trail for actions on sensitive data.
 *
 * Deliberately never updated or deleted here — an audit trail an application
 * can edit is not one. Rows age out through the retention purge, nowhere else.
 *
 * ## Two failure policies, chosen per operation
 *
 * `recordAudit` is best-effort: a failure is logged loudly but does not fail
 * the action the user asked for. Refusing every action on a log failure would
 * mean a full table could block a patient from revoking consent, which is
 * worse than a gap in the trail.
 *
 * That trade is wrong for the operations where the record *is* the point.
 * Deleting a tenant, revoking access, releasing a domain and exporting a
 * clinic's patients are all things whose only lasting evidence is the audit
 * row — and best-effort meant the mutation could succeed while the evidence
 * of it silently vanished. That is precisely how a clinic once disappeared
 * leaving nothing to point at.
 *
 * For those, `recordAuditIn` writes through the caller's transaction and
 * throws on failure, so the mutation and its record commit together or not at
 * all. See docs/audit-durability.md for the tiering.
 */

/**
 * Anything able to write an audit row: the client itself, or the transaction
 * client handed to a `$transaction` callback. Structural, so both satisfy it
 * without either being imported here.
 */
export type AuditWriter = Pick<PrismaClient, "auditLog">

/** Shapes an entry into a row. The single place the mapping lives. */
function auditRow(entry: AuditEntry) {
  return {
    action: entry.action,
    subjectType: entry.subjectType,
    subjectId: entry.subjectId ?? null,
    actorId: entry.actorId ?? null,
    actorRole: entry.actorRole ?? null,
    organizationId: entry.organizationId ?? null,
    result: entry.result ?? "success",
    requestId: entry.requestId ?? null,
    metadata: (entry.metadata ?? {}) as object,
  }
}

/**
 * Records an entry through the caller's transaction, failing loudly.
 *
 * Tier A. Call inside `prisma.$transaction` alongside the mutation: if this
 * throws, the transaction rolls back and the mutation never happened, which is
 * the point. An operation whose evidence could not be written is an operation
 * that should not have completed.
 */
export async function recordAuditIn(
  tx: AuditWriter,
  entry: AuditEntry,
): Promise<void> {
  await tx.auditLog.create({ data: auditRow(entry) })
}

/** The denied counterpart of recordAuditIn. */
export async function recordDeniedIn(
  tx: AuditWriter,
  entry: Omit<AuditEntry, "result">,
): Promise<void> {
  await recordAuditIn(tx, { ...entry, result: "denied" })
}

/**
 * A closed union, so a new event is a deliberate addition rather than a free
 * string that quietly diverges ("scan.create" vs "scan.created").
 *
 * Weighted toward security-sensitive and business-critical actions. Reads of
 * patient data are audited because that is the access a clinic must be able to
 * account for; ordinary navigation is not.
 */
export type AuditAction =
  // Tenant lifecycle
  | "tenant.created"
  | "tenant.updated"
  | "tenant.suspended"
  | "tenant.deleted"
  | "tenant.comp_access_changed"
  | "tenant.plan_changed"
  // Tenant configuration that changes the advice patients receive. Recorded
  // alongside the other tenant.* transitions rather than as its own vocabulary.
  | "tenant.recommendation_weights_changed"
  // Tenant routing — which hosts serve this tenant. A custom domain changes
  // where the clinic answers, so each transition is recorded on its own.
  | "tenant.domain_claimed"
  | "tenant.domain_verified"
  | "tenant.domain_removed"
  // Tenant credentials — programmatic access to one tenant's data
  | "apikey.created"
  | "apikey.revoked"
  // Catalogue. Carries organizationId for a clinic's own product and null for
  // an Aurora one, which is the same distinction the catalogue itself draws.
  | "product.created"
  | "product.updated"
  | "product.archived"
  | "product.recommendation_enabled"
  | "product.recommendation_disabled"
  // Product intelligence. Named under product.* like the rest of the catalogue
  // vocabulary rather than a new intelligence.* namespace, because the subject
  // is a product and subjectType already says so.
  //
  // Extraction itself is deliberately not here. It runs automatically on every
  // creation and every sync, and the audit log records administrative acts
  // rather than machine events — the outcome already lives on the product row
  // as intelligenceStatus, intelligenceExtractedAt and intelligenceError.
  | "product.intelligence_corrected"
  | "product.intelligence_verified"
  | "product.intelligence_verification_revoked"
  // Membership lifecycle — who may act inside a tenant
  | "membership.created"
  | "membership.role_changed"
  | "membership.suspended"
  | "membership.reactivated"
  | "membership.invited"
  | "membership.invitation_cancelled"
  | "membership.revoked"
  // Patient data
  | "patient.viewed"
  | "patient.exported"
  // Clinical records
  | "scan.created"
  | "scan.viewed"
  | "report.viewed"
  // Appointments
  | "appointment.created"
  | "appointment.viewed"
  | "appointment.confirmed"
  | "appointment.cancelled"
  | "appointment.completed"
  // Money
  | "payment.completed"
  | "payment.failed"
  // No "subscription.created": subscription-sync reports every Stripe state
  // change as updated or cancelled, and a first sync is not distinguishable
  // from a later one at the point the webhook arrives. Removed rather than
  // left declared and unwritten.
  | "subscription.updated"
  | "subscription.cancelled"
  | "affiliate.order_attributed"
  | "affiliate.payout_recorded"
  // Marketplace approvals
  | "expert.approved"
  | "expert.rejected"
  | "affiliate.approved"
  | "affiliate.rejected"
  // Platform control plane
  //
  // "admin.tenant_entered" was declared here for a support-session feature that
  // does not exist. Removed rather than left standing: an action nobody writes
  // reads, in the viewer, as an event that never happens — indistinguishable
  // from one that happens and is not recorded. If entering a tenant as a
  // support action is ever built, it reintroduces this deliberately, along with
  // the rule that a platform admin must never become a clinic member to do it.
  | "admin.data_exported"
  // AI training pipeline
  | "training.consent.granted"
  | "training.consent.revoked"
  | "training.clinic_contribution.enabled"
  | "training.clinic_contribution.disabled"
  | "training.record.collected"
  | "training.record.validated"
  | "training.record.withdrawn"
  | "training.dataset.exported"

export type AuditEntry = {
  action: AuditAction
  subjectType:
    | "user"
    | "clinic"
    | "membership"
    | "scan"
    | "report"
    | "booking"
    | "payment"
    | "expert"
    | "affiliate"
    | "subscription"
    | "training_record"
    | "dataset"
    | "apikey"
    | "product"
  subjectId?: string | null
  actorId?: string | null
  actorRole?: string | null
  /**
   * The tenant the action happened in.
   *
   * Recorded alongside actorId rather than instead of it. A platform admin
   * acting inside a clinic must leave both behind, or the trail cannot answer
   * "who did this, and on whose site".
   */
  organizationId?: string | null
  /** Defaults to success; set "denied" to record a refused attempt. */
  result?: AuditResult
  /** Correlates every entry written while serving one request. */
  requestId?: string | null
  /** Never put patient content, secrets or payment credentials here. */
  metadata?: Record<string, unknown>
}

/**
 * A webhook or scheduled job has no browser user behind it.
 *
 * Recorded as actorId null with actorRole "system" rather than by inventing
 * a user: a fabricated actor is worse than an honest absence, because it
 * makes an unattributable action look attributable. The null actorId is the
 * convention the schema already documents for a scheduled purge.
 */
export const SYSTEM_ACTOR = { actorId: null, actorRole: "system" } as const

export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await recordAuditIn(prisma, entry)
  } catch (error) {
    console.error("[audit] Failed to record entry", { action: entry.action, error })
  }
}

/** Bulk variant, so collecting a batch writes one row per record cheaply. */
export async function recordAuditMany(entries: AuditEntry[]): Promise<void> {
  if (entries.length === 0) return

  try {
    await prisma.auditLog.createMany({ data: entries.map(auditRow) })
  } catch (error) {
    console.error("[audit] Failed to record batch", {
      count: entries.length,
      error,
    })
  }
}

/**
 * Records a refused attempt.
 *
 * Denials are the entries an investigation actually needs — a successful read
 * looks like every other successful read, while a refusal shows someone
 * reaching for something that was not theirs.
 */
export async function recordDenied(
  entry: Omit<AuditEntry, "result">,
): Promise<void> {
  await recordAudit({ ...entry, result: "denied" })
}
