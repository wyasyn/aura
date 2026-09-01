import "dotenv/config"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { after, before, describe, it } from "node:test"

import type { AuditResult } from "@/generated/prisma/client"
import { recordAudit, recordAuditIn } from "@/lib/audit/log"
import { prisma } from "@/lib/db/client"

/**
 * Audit durability, exercised against the real database.
 *
 * Mocking recordAudit and asserting it was called would prove nothing about
 * the property under test, which is transactional: that a mutation and its
 * audit row commit together, and that neither can survive the other's failure.
 * That only exists in the database, so it is tested there.
 *
 * A failing audit write is produced by handing the enum column a value the
 * type does not contain, which Prisma rejects before the statement is sent.
 * The rejection point does not matter to what is being proved: the property is
 * that the callback throwing rolls the transaction back, and the surrounding
 * mutation is a real write to a real row either way. What matters is that the
 * failure is not a stubbed function pretending to fail.
 *
 * Everything created here is namespaced by a run id and removed afterwards, so
 * this is safe against a shared development database.
 */

const RUN = randomUUID().slice(0, 8)
const created = { organizationIds: [] as string[], userIds: [] as string[] }

/** An entry Postgres will refuse: "bogus" is not a member of the enum. */
const brokenEntry = (organizationId: string) =>
  ({
    action: "tenant.deleted",
    subjectType: "clinic",
    organizationId,
    result: "bogus" as AuditResult,
  }) as const

let organizationId: string
let memberId: string
let userId: string

before(async () => {
  userId = randomUUID()
  await prisma.user.create({
    data: {
      id: userId,
      email: `durability-${RUN}@example.test`,
      name: `Durability ${RUN}`,
      emailVerified: true,
      role: "user",
    },
  })
  created.userIds.push(userId)

  organizationId = randomUUID()
  await prisma.organization.create({
    data: {
      id: organizationId,
      name: `Durability ${RUN}`,
      slug: `dur-${RUN}`,
    },
  })
  created.organizationIds.push(organizationId)

  const member = await prisma.member.create({
    data: { id: randomUUID(), organizationId, userId, role: "member" },
  })
  memberId = member.id
})

after(async () => {
  await prisma.auditLog.deleteMany({ where: { organizationId } })
  await prisma.organization.deleteMany({
    where: { id: { in: created.organizationIds } },
  })
  await prisma.user.deleteMany({ where: { id: { in: created.userIds } } })
})

describe("the two failure policies differ, and both are deliberate", () => {
  // Tier B/C. A full log table must not stop a patient revoking consent.
  it("recordAudit swallows a failed write", async () => {
    await assert.doesNotReject(() => recordAudit(brokenEntry(organizationId)))
  })

  // Tier A. The caller decides what a failure means, so it has to reach them.
  it("recordAuditIn lets the failure through", async () => {
    await assert.rejects(() =>
      prisma.$transaction((tx) => recordAuditIn(tx, brokenEntry(organizationId))),
    )
  })
})

describe("a Tier A mutation and its record commit together", () => {
  it("both exist when the audit succeeds", async () => {
    const subjectId = randomUUID()

    await prisma.$transaction(async (tx) => {
      await tx.member.update({
        where: { id: memberId },
        data: { status: "suspended" },
      })
      await recordAuditIn(tx, {
        action: "membership.suspended",
        subjectType: "membership",
        subjectId,
        actorId: userId,
        actorRole: "admin",
        organizationId,
      })
    })

    const member = await prisma.member.findUnique({ where: { id: memberId } })
    const entry = await prisma.auditLog.findFirst({ where: { subjectId } })

    assert.equal(member?.status, "suspended")
    assert.ok(entry, "the audit row must exist")
    assert.equal(entry.result, "success")
  })

  // The property the whole tier exists for: evidence that could not be written
  // means the thing it describes did not happen.
  it("neither exists when the audit fails", async () => {
    const before = await prisma.member.findUnique({ where: { id: memberId } })
    assert.equal(before?.status, "suspended", "precondition from the last test")

    await assert.rejects(() =>
      prisma.$transaction(async (tx) => {
        await tx.member.update({
          where: { id: memberId },
          data: { status: "revoked" },
        })
        await recordAuditIn(tx, brokenEntry(organizationId))
      }),
    )

    const after = await prisma.member.findUnique({ where: { id: memberId } })
    assert.equal(
      after?.status,
      "suspended",
      "the revocation must have rolled back with its failed audit",
    )
  })

  // The mirror: an audit row must never outlive a mutation that did not happen.
  it("no record survives a failed mutation", async () => {
    const subjectId = randomUUID()

    await assert.rejects(() =>
      prisma.$transaction(async (tx) => {
        await recordAuditIn(tx, {
          action: "membership.revoked",
          subjectType: "membership",
          subjectId,
          actorId: userId,
          actorRole: "admin",
          organizationId,
        })
        // No such membership: the mutation fails after the record was written.
        await tx.member.update({
          where: { id: randomUUID() },
          data: { status: "revoked" },
        })
      }),
    )

    const entry = await prisma.auditLog.findFirst({ where: { subjectId } })
    assert.equal(entry, null, "the audit row must have rolled back too")
  })
})

describe("the audit row outlives the tenant it describes", () => {
  // AuditLog.organizationId is a plain column with no foreign key, which is
  // what lets the deletion record survive the cascade it is describing.
  it("deleting the organization leaves tenant.deleted behind", async () => {
    const doomedUser = randomUUID()
    await prisma.user.create({
      data: {
        id: doomedUser,
        email: `durability-doomed-${RUN}@example.test`,
        name: "Doomed",
        emailVerified: true,
        role: "user",
      },
    })
    created.userIds.push(doomedUser)

    const doomed = randomUUID()
    await prisma.organization.create({
      data: { id: doomed, name: `Doomed ${RUN}`, slug: `doomed-${RUN}` },
    })
    await prisma.member.create({
      data: { id: randomUUID(), organizationId: doomed, userId: doomedUser, role: "owner" },
    })

    await prisma.$transaction(async (tx) => {
      await recordAuditIn(tx, {
        action: "tenant.deleted",
        subjectType: "clinic",
        subjectId: doomed,
        actorId: doomedUser,
        actorRole: "admin",
        organizationId: doomed,
        metadata: { subdomain: `doomed-${RUN}` },
      })
      await tx.organization.delete({ where: { id: doomed } })
    })

    const org = await prisma.organization.findUnique({ where: { id: doomed } })
    const members = await prisma.member.count({ where: { organizationId: doomed } })
    const entry = await prisma.auditLog.findFirst({
      where: { subjectId: doomed, action: "tenant.deleted" },
    })

    assert.equal(org, null, "the tenant is gone")
    assert.equal(members, 0, "its memberships cascaded")
    assert.ok(entry, "the record of the deletion survives the deletion")
    assert.equal(entry.organizationId, doomed)

    await prisma.auditLog.deleteMany({ where: { organizationId: doomed } })
  })
})
