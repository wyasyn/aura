import type { TenantScope } from "@/lib/clinics/membership"
import { prisma } from "@/lib/db/client"

/**
 * Scans belonging to one clinic.
 *
 * Every read here is filtered by organizationId, the single boundary keeping
 * one tenant's patient records out of another's dashboard. The TenantScope
 * parameter makes that boundary enforceable rather than conventional: it can
 * only be produced by resolving a membership, so an id taken from a route
 * param or form field will not typecheck here.
 */
export async function listClinicScans(organizationId: TenantScope, take = 100) {
  const scans = await prisma.scan.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      status: true,
      captureMode: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
      report: { select: { id: true } },
      result: { select: { overallBand: true } },
    },
  })

  return scans.map((scan) => ({
    id: scan.id,
    status: scan.status,
    captureMode: scan.captureMode,
    createdAt: scan.createdAt,
    patientName: scan.user.name,
    patientEmail: scan.user.email,
    hasReport: Boolean(scan.report),
    overallBand: scan.result?.overallBand ?? null,
  }))
}

export type ClinicScanRow = Awaited<ReturnType<typeof listClinicScans>>[number]

export async function countClinicScans(organizationId: TenantScope) {
  return prisma.scan.count({ where: { organizationId } })
}

/** Staff of one clinic, for the team page and seat-limit checks. */
/**
 * Staff of one clinic.
 *
 * Revoked memberships are excluded: the row is kept so the relationship stays
 * on record and auditable, but a revoked person is not staff and must not
 * appear in the team list or hold a seat.
 */
export async function listClinicMembers(organizationId: TenantScope) {
  const members = await prisma.member.findMany({
    where: { organizationId, status: { not: "revoked" } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      role: true,
      status: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
  })

  return members.map((member) => ({
    id: member.id,
    role: member.role,
    status: member.status,
    joinedAt: member.createdAt,
    userId: member.user.id,
    name: member.user.name,
    email: member.user.email,
  }))
}

export type ClinicMemberRow = Awaited<ReturnType<typeof listClinicMembers>>[number]

export async function listClinicInvitations(organizationId: TenantScope) {
  return prisma.invitation.findMany({
    where: { organizationId, status: "pending" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      expiresAt: true,
      createdAt: true,
    },
  })
}

export type ClinicInvitationRow = Awaited<
  ReturnType<typeof listClinicInvitations>
>[number]

/**
 * People registered as patients of one clinic.
 *
 * ClinicPatient.organizationId is the authoritative patient-to-tenant boundary.
 * Until now nothing queried it: the clinic dashboard listed *scans* and derived
 * patient details from them, so a patient who had registered but not yet
 * scanned was invisible to their own clinic.
 */
export async function listClinicPatients(organizationId: TenantScope, take = 200) {
  const patients = await prisma.clinicPatient.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          _count: { select: { scans: true } },
        },
      },
    },
  })

  return patients.map((patient) => ({
    id: patient.id,
    userId: patient.user.id,
    name: patient.user.name,
    email: patient.user.email,
    scanCount: patient.user._count.scans,
    joinedAt: patient.createdAt,
  }))
}

export type ClinicPatientRow = Awaited<ReturnType<typeof listClinicPatients>>[number]

export async function countClinicPatients(organizationId: TenantScope) {
  return prisma.clinicPatient.count({ where: { organizationId } })
}

/**
 * Consultations booked inside one clinic.
 *
 * Booking.organizationId was added in Phase 2 and, until now, only written.
 * The expert stays global — one expert serves many clinics — so the tenant
 * boundary is the booking, never the expert.
 */
export async function listClinicAppointments(
  organizationId: TenantScope,
  take = 100,
) {
  const bookings = await prisma.booking.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      status: true,
      createdAt: true,
      amountCents: true,
      currency: true,
      slot: { select: { startTime: true, endTime: true } },
      user: { select: { name: true, email: true } },
      expert: { select: { user: { select: { name: true } } } },
    },
  })

  return bookings.map((booking) => ({
    id: booking.id,
    status: booking.status,
    createdAt: booking.createdAt,
    startTime: booking.slot.startTime,
    endTime: booking.slot.endTime,
    amountCents: booking.amountCents,
    currency: booking.currency,
    patientName: booking.user.name,
    patientEmail: booking.user.email,
    expertName: booking.expert.user.name,
  }))
}

export type ClinicAppointmentRow = Awaited<
  ReturnType<typeof listClinicAppointments>
>[number]

/**
 * One consultation, but only if it belongs to this tenant.
 *
 * findFirst with the scope in the where clause, never findUnique on the id
 * alone: an id is guessable, and a lookup by id that is filtered afterwards has
 * already read another tenant's row by the time the check runs.
 */
export async function findClinicAppointment(
  organizationId: TenantScope,
  bookingId: string,
) {
  return prisma.booking.findFirst({
    where: { id: bookingId, organizationId },
    select: {
      id: true,
      status: true,
      createdAt: true,
      videoRoomUrl: true,
      slot: { select: { startTime: true, endTime: true } },
      user: { select: { name: true, email: true } },
      expert: { select: { user: { select: { name: true } } } },
    },
  })
}
