import { recordAudit, recordDenied } from "@/lib/audit/log"
import { requireClinicMember, resolveClinicSession } from "@/lib/clinics/membership"
import { can, requirePermission } from "@/lib/clinics/permissions"
import { listClinicScans, type ClinicScanRow } from "@/lib/clinics/queries"

/**
 * Reading a clinic's scans — the reference implementation for a tenant-aware
 * Aurora read.
 *
 * The whole chain, in order, with nothing invented:
 *
 *   identity + tenant + membership   requireClinicMember()   (Phase 2)
 *   permission                       requirePermission()     (Phase 2)
 *   tenant-scoped query              session.scope           (TenantScope)
 *   audit                            recordAudit()
 *
 * Copy this shape for patients, appointments and everything after. Do not add
 * a second tenant resolver, a second permission check, or a second scoping
 * mechanism — every one of those already exists and is used here.
 *
 * Note what is absent: an organizationId parameter. The tenant comes from the
 * resolved session and nowhere else, so there is no argument a caller could
 * forge. `session.scope` is a branded TenantScope that only requireClinicMember
 * can mint, which is why passing a raw string here would not typecheck.
 */
export async function listScansForCurrentTenant(
  take?: number,
): Promise<ClinicScanRow[]> {
  // Resolves identity, tenant and membership together, and refuses anything
  // that is not an active membership of *this* tenant.
  const session = await requireClinicMember()

  requirePermission(session, "SCAN_VIEW")

  const scans = await listClinicScans(session.scope, take)

  // Patient records were read. Who, in which tenant, and how many — never the
  // records themselves.
  await recordAudit({
    action: "scan.viewed",
    subjectType: "clinic",
    subjectId: session.tenant.organizationId,
    actorId: session.userId,
    actorRole: session.role,
    organizationId: session.tenant.organizationId,
    metadata: { count: scans.length },
  })

  return scans
}

/**
 * As above, but reports the refusal instead of throwing.
 *
 * A denial is the audit entry an investigation actually needs: a successful
 * read looks like every other successful read, while a refusal shows someone
 * reaching for something that was not theirs.
 */
export async function listScansForCurrentTenantOrDeny(): Promise<
  { ok: true; scans: ClinicScanRow[] } | { ok: false; reason: string }
> {
  const result = await resolveClinicSession()

  if (result.kind !== "ok") {
    return { ok: false, reason: result.kind }
  }

  if (!can(result.session, "SCAN_VIEW")) {
    await recordDenied({
      action: "scan.viewed",
      subjectType: "clinic",
      subjectId: result.session.tenant.organizationId,
      actorId: result.session.userId,
      actorRole: result.session.role,
      organizationId: result.session.tenant.organizationId,
      metadata: { permission: "SCAN_VIEW" },
    })
    return { ok: false, reason: "forbidden" }
  }

  return { ok: true, scans: await listClinicScans(result.session.scope) }
}
