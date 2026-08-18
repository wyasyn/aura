import "dotenv/config"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { after, before, describe, it } from "node:test"

import { prisma } from "@/lib/db/client"
import type { TenantScope } from "@/lib/clinics/membership"
import {
  listClinicInvitations,
  listClinicMembers,
  listClinicScans,
} from "@/lib/clinics/queries"

/**
 * Production code can only obtain a TenantScope by resolving a membership,
 * which needs a request context these tests don't have. Minting one directly
 * here is the point: it lets the tests check that the queries filter correctly
 * even when handed an id, which is the guarantee the brand is protecting.
 */
const scopeOf = (organizationId: string) => organizationId as TenantScope

/**
 * Tenant isolation, exercised against the real database.
 *
 * The boundary keeping one clinic's patient records out of another's dashboard
 * is a single organizationId filter on every tenant-scoped read. That is easy
 * to get right once and easy to lose later, so it is asserted here rather than
 * left to review. These also cover the deny paths that can't be driven through
 * the browser, since better-auth's session cookie is httpOnly.
 *
 * Everything created here is namespaced with a unique run id and removed in
 * `after`, so the suite can run against a shared development database.
 */

const RUN = randomUUID().slice(0, 8)

type Fixture = {
  organizationId: string
  clinicId: string
  ownerId: string
  outsiderId: string
  scanId: string
  memberId: string
  invitationId: string
}

const created = {
  userIds: [] as string[],
  organizationIds: [] as string[],
}

async function makeUser(label: string): Promise<string> {
  const id = randomUUID()
  await prisma.user.create({
    data: {
      id,
      email: `isolation-${RUN}-${label}@example.test`,
      name: `Isolation ${label}`,
      emailVerified: true,
      role: "user",
    },
  })
  created.userIds.push(id)
  return id
}

async function makeClinic(label: string): Promise<Fixture> {
  const ownerId = await makeUser(`${label}-owner`)
  const outsiderId = await makeUser(`${label}-outsider`)
  const patientId = await makeUser(`${label}-patient`)

  const organizationId = randomUUID()
  await prisma.organization.create({
    data: {
      id: organizationId,
      name: `Isolation ${label} ${RUN}`,
      slug: `iso-${RUN}-${label}`,
    },
  })
  created.organizationIds.push(organizationId)

  const member = await prisma.member.create({
    data: { id: randomUUID(), organizationId, userId: ownerId, role: "owner" },
  })

  const clinic = await prisma.clinicSettings.create({
    data: {
      organizationId,
      subdomain: `iso-${RUN}-${label}`,
      displayName: `Isolation ${label}`,
      subscriptionStatus: "active",
    },
  })

  const scan = await prisma.scan.create({
    data: { userId: patientId, organizationId, status: "completed" },
  })

  const invitation = await prisma.invitation.create({
    data: {
      id: randomUUID(),
      organizationId,
      email: `invitee-${RUN}-${label}@example.test`,
      role: "member",
      status: "pending",
      inviterId: ownerId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })

  return {
    organizationId,
    clinicId: clinic.id,
    ownerId,
    outsiderId,
    scanId: scan.id,
    memberId: member.id,
    invitationId: invitation.id,
  }
}

let clinicA: Fixture
let clinicB: Fixture

describe("tenant isolation", () => {
  before(async () => {
    clinicA = await makeClinic("a")
    clinicB = await makeClinic("b")
  })

  after(async () => {
    // Organizations cascade to members, invitations and clinic settings. Scans
    // are only SetNull on organization delete, so they are removed by user.
    await prisma.organization.deleteMany({
      where: { id: { in: created.organizationIds } },
    })
    await prisma.user.deleteMany({ where: { id: { in: created.userIds } } })
  })

  describe("scans", () => {
    it("returns only the requesting clinic's scans", async () => {
      const scans = await listClinicScans(scopeOf(clinicA.organizationId))
      const ids = scans.map((scan) => scan.id)

      assert.ok(ids.includes(clinicA.scanId), "clinic A should see its own scan")
      assert.ok(
        !ids.includes(clinicB.scanId),
        "clinic A must not see clinic B's scan",
      )
    })

    it("does not leak the other clinic's patient identity", async () => {
      const scans = await listClinicScans(scopeOf(clinicA.organizationId))
      const emails = scans.map((scan) => scan.patientEmail)
      assert.ok(
        emails.every((email) => !email.includes(`${RUN}-b-patient`)),
        "clinic B's patient must not appear in clinic A's list",
      )
    })
  })

  describe("members and invitations", () => {
    it("returns only the requesting clinic's members", async () => {
      const members = await listClinicMembers(scopeOf(clinicA.organizationId))
      const ids = members.map((member) => member.id)

      assert.ok(ids.includes(clinicA.memberId))
      assert.ok(!ids.includes(clinicB.memberId))
    })

    it("returns only the requesting clinic's invitations", async () => {
      const invitations = await listClinicInvitations(scopeOf(clinicA.organizationId))
      const ids = invitations.map((invitation) => invitation.id)

      assert.ok(ids.includes(clinicA.invitationId))
      assert.ok(!ids.includes(clinicB.invitationId))
    })
  })

  describe("cross-tenant id guessing", () => {
    // Mirrors the where-clause shape the member and invitation actions use.
    // A manager of clinic A supplying one of clinic B's ids must match nothing,
    // rather than mutating another tenant's row.
    it("does not match another clinic's member by id", async () => {
      const found = await prisma.member.findFirst({
        where: { id: clinicB.memberId, organizationId: clinicA.organizationId },
      })
      assert.equal(found, null)
    })

    it("does not match another clinic's invitation by id", async () => {
      const result = await prisma.invitation.updateMany({
        where: {
          id: clinicB.invitationId,
          organizationId: clinicA.organizationId,
        },
        data: { status: "canceled" },
      })
      assert.equal(result.count, 0, "cancel must affect no rows across tenants")

      const untouched = await prisma.invitation.findUniqueOrThrow({
        where: { id: clinicB.invitationId },
      })
      assert.equal(untouched.status, "pending")
    })
  })

  describe("membership", () => {
    // The deny path behind ClinicAuthGate: no Member row means no access, and
    // it is what stops a signed-in stranger reading a clinic's patient list.
    it("finds no membership for a non-member", async () => {
      const membership = await prisma.member.findUnique({
        where: {
          userId_organizationId: {
            userId: clinicA.outsiderId,
            organizationId: clinicA.organizationId,
          },
        },
      })
      assert.equal(membership, null)
    })

    it("finds no membership for a member of a different clinic", async () => {
      const membership = await prisma.member.findUnique({
        where: {
          userId_organizationId: {
            userId: clinicB.ownerId,
            organizationId: clinicA.organizationId,
          },
        },
      })
      assert.equal(membership, null)
    })

    it("finds the membership for the clinic's own owner", async () => {
      const membership = await prisma.member.findUnique({
        where: {
          userId_organizationId: {
            userId: clinicA.ownerId,
            organizationId: clinicA.organizationId,
          },
        },
      })
      assert.equal(membership?.role, "owner")
    })
  })

  describe("tenant deletion", () => {
    // The claim the delete dialog makes to the admin: staff and invitations go,
    // but patient scans survive and detach. If the schema ever changed to
    // cascade, this is what would catch it before it destroyed medical records.
    it("detaches patient scans instead of deleting them", async () => {
      const doomed = await makeClinic("doomed")

      await prisma.organization.delete({ where: { id: doomed.organizationId } })

      const scan = await prisma.scan.findUnique({ where: { id: doomed.scanId } })
      assert.ok(scan, "the patient's scan must survive the clinic's deletion")
      assert.equal(
        scan.organizationId,
        null,
        "the scan must be detached from the deleted clinic",
      )

      const [members, invitations, clinic] = await Promise.all([
        prisma.member.count({ where: { organizationId: doomed.organizationId } }),
        prisma.invitation.count({
          where: { organizationId: doomed.organizationId },
        }),
        prisma.clinicSettings.findUnique({ where: { id: doomed.clinicId } }),
      ])

      assert.equal(members, 0, "members cascade away with the organization")
      assert.equal(invitations, 0, "invitations cascade away too")
      assert.equal(clinic, null, "clinic settings cascade away too")
    })

    it("frees the subdomain for reuse after deletion", async () => {
      const recycled = await makeClinic("recycle")
      const subdomain = `iso-${RUN}-recycle`

      await prisma.organization.delete({ where: { id: recycled.organizationId } })

      const reuseOrgId = randomUUID()
      await prisma.organization.create({
        data: { id: reuseOrgId, name: `Reuse ${RUN}`, slug: `${subdomain}-2` },
      })
      created.organizationIds.push(reuseOrgId)

      const reused = await prisma.clinicSettings.create({
        data: {
          organizationId: reuseOrgId,
          subdomain,
          displayName: "Reused",
        },
      })
      assert.equal(reused.subdomain, subdomain)
    })
  })

  describe("subdomain uniqueness", () => {
    it("refuses a second clinic on the same subdomain", async () => {
      const organizationId = randomUUID()
      await prisma.organization.create({
        data: {
          id: organizationId,
          name: `Dupe ${RUN}`,
          slug: `iso-${RUN}-dupe`,
        },
      })
      created.organizationIds.push(organizationId)

      await assert.rejects(
        prisma.clinicSettings.create({
          data: {
            organizationId,
            // Already taken by clinic A.
            subdomain: `iso-${RUN}-a`,
            displayName: "Dupe",
          },
        }),
        "a duplicate subdomain must be rejected by the database, not just the form",
      )
    })
  })
})
