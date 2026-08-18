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
export async function listClinicMembers(organizationId: TenantScope) {
  const members = await prisma.member.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      role: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
  })

  return members.map((member) => ({
    id: member.id,
    role: member.role,
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
