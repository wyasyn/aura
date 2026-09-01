import { recordAudit, recordDenied } from "@/lib/audit/log"
import { requireClinicMember, resolveClinicSession } from "@/lib/clinics/membership"
import { can, requirePermission } from "@/lib/clinics/permissions"
import {
  findClinicAppointment,
  listClinicAppointments,
  listClinicPatients,
  type ClinicAppointmentRow,
  type ClinicPatientRow,
} from "@/lib/clinics/queries"

/**
 * Patients and appointments for the current tenant.
 *
 * The same shape as lib/scan/tenant-scans.ts, which is the reference:
 *
 *   requireClinicMember()   identity + tenant + active membership
 *   requirePermission()     the action
 *   session.scope           branded TenantScope into the query
 *   recordAudit()           actor + tenant + result
 *
 * None of these functions takes an organizationId. The tenant comes from the
 * resolved session and nowhere else, so there is no argument for a caller to
 * forge, and a plain string would not typecheck into the scoped queries.
 */

export async function listPatientsForCurrentTenant(): Promise<ClinicPatientRow[]> {
  const session = await requireClinicMember()
  requirePermission(session, "PATIENT_VIEW")

  const patients = await listClinicPatients(session.scope)

  await recordAudit({
    action: "patient.viewed",
    subjectType: "clinic",
    subjectId: session.tenant.organizationId,
    actorId: session.userId,
    actorRole: session.role,
    organizationId: session.tenant.organizationId,
    // A count, never the people. Names and emails are the thing being
    // protected; repeating them into the audit table defeats the point.
    metadata: { count: patients.length },
  })

  return patients
}

export async function listAppointmentsForCurrentTenant(): Promise<
  ClinicAppointmentRow[]
> {
  const session = await requireClinicMember()
  requirePermission(session, "APPOINTMENT_VIEW")

  const appointments = await listClinicAppointments(session.scope)

  await recordAudit({
    action: "appointment.viewed",
    subjectType: "clinic",
    subjectId: session.tenant.organizationId,
    actorId: session.userId,
    actorRole: session.role,
    organizationId: session.tenant.organizationId,
    metadata: { count: appointments.length },
  })

  return appointments
}

/**
 * One appointment, by id, for the current tenant.
 *
 * The id is caller-supplied and therefore untrusted: it is passed into a query
 * that already carries the tenant scope, so an id belonging to another clinic
 * simply does not match. Nothing is read and then checked.
 *
 * A miss is audited as a denial. A guessed or leaked booking id being tried
 * against the wrong clinic is exactly the event worth being able to see later,
 * and it is indistinguishable from a typo without the record.
 */
export async function getAppointmentForCurrentTenant(bookingId: string) {
  const session = await requireClinicMember()
  requirePermission(session, "APPOINTMENT_VIEW")

  const appointment = await findClinicAppointment(session.scope, bookingId)

  if (!appointment) {
    await recordDenied({
      action: "appointment.viewed",
      subjectType: "booking",
      subjectId: bookingId,
      actorId: session.userId,
      actorRole: session.role,
      organizationId: session.tenant.organizationId,
      metadata: { reason: "not_in_tenant" },
    })
    return null
  }

  await recordAudit({
    action: "appointment.viewed",
    subjectType: "booking",
    subjectId: appointment.id,
    actorId: session.userId,
    actorRole: session.role,
    organizationId: session.tenant.organizationId,
  })

  return appointment
}

/** Reports the refusal instead of throwing, for callers that render an empty state. */
export async function listPatientsForCurrentTenantOrDeny(): Promise<
  { ok: true; patients: ClinicPatientRow[] } | { ok: false; reason: string }
> {
  const result = await resolveClinicSession()
  if (result.kind !== "ok") return { ok: false, reason: result.kind }

  if (!can(result.session, "PATIENT_VIEW")) {
    await recordDenied({
      action: "patient.viewed",
      subjectType: "clinic",
      subjectId: result.session.tenant.organizationId,
      actorId: result.session.userId,
      actorRole: result.session.role,
      organizationId: result.session.tenant.organizationId,
      metadata: { permission: "PATIENT_VIEW" },
    })
    return { ok: false, reason: "forbidden" }
  }

  return { ok: true, patients: await listClinicPatients(result.session.scope) }
}
