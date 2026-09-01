"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { issueApiKey } from "@/lib/api-keys/keys"
import { recordAudit, recordAuditIn, recordDenied } from "@/lib/audit/log"
import { currentRequestId } from "@/lib/audit/request-id"
import { requireClinicManager } from "@/lib/clinics/membership"
import { prisma } from "@/lib/db/client"

/**
 * An API key is programmatic access to one tenant's data, so issuing and
 * revoking one is audited.
 *
 * The metadata carries the key's name and prefix only. The plaintext and the
 * hash are both absent by design: the prefix is enough to tell two keys apart
 * in a log, and neither of the other two can be used to authenticate from
 * there.
 */

const MAX_ACTIVE_KEYS = 10

const createSchema = z.object({
  name: z.string().trim().min(2, "Give the key a name").max(60),
})

/**
 * Issues a partner API key. The plaintext is returned exactly once here and is
 * never stored, so it cannot be shown again if the user navigates away.
 */
export async function createClinicApiKeyAction(input: unknown) {
  const session = await requireClinicManager()
  const { name } = createSchema.parse(input)

  const activeCount = await prisma.apiKey.count({
    where: { organizationId: session.scope, revokedAt: null },
  })
  if (activeCount >= MAX_ACTIVE_KEYS) {
    throw new Error(
      `You already have ${MAX_ACTIVE_KEYS} active keys. Revoke one before creating another.`,
    )
  }

  const issued = issueApiKey()

  const created = await prisma.apiKey.create({
    data: {
      organizationId: session.scope,
      name,
      hashedKey: issued.hashedKey,
      keyPrefix: issued.keyPrefix,
      createdById: session.userId,
    },
    select: { id: true },
  })

  await recordAudit({
    action: "apikey.created",
    subjectType: "apikey",
    subjectId: created.id,
    actorId: session.userId,
    actorRole: session.role,
    organizationId: session.tenant.organizationId,
    metadata: { name, keyPrefix: issued.keyPrefix },
  })

  revalidatePath("/clinic/api")
  return { plaintext: issued.plaintext, name }
}

const revokeSchema = z.object({ apiKeyId: z.string().trim().min(1) })

export async function revokeClinicApiKeyAction(input: unknown) {
  const session = await requireClinicManager()
  const { apiKeyId } = revokeSchema.parse(input)

  // Scoped by organization so a manager of one clinic cannot revoke another
  // clinic's key by guessing an id.
  //
  // Tier A: revoking a credential and recording the revocation commit
  // together. A revoked key with no record of who revoked it, or a record of a
  // revocation that did not happen, are both worse than the operation failing.
  const requestId = await currentRequestId()
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.apiKey.updateMany({
      where: { id: apiKeyId, organizationId: session.scope, revokedAt: null },
      data: { revokedAt: new Date() },
    })

    if (updated.count > 0) {
      await recordAuditIn(tx, {
        action: "apikey.revoked",
        subjectType: "apikey",
        subjectId: apiKeyId,
        actorId: session.userId,
        actorRole: session.role,
        organizationId: session.tenant.organizationId,
        requestId,
      })
    }

    return updated
  })

  if (result.count === 0) {
    // Either no such key, an already-revoked one, or one belonging to another
    // clinic — the caller cannot tell which, and the attempt is recorded.
    await recordDenied({
      action: "apikey.revoked",
      subjectType: "apikey",
      subjectId: apiKeyId,
      actorId: session.userId,
      actorRole: session.role,
      organizationId: session.tenant.organizationId,
      metadata: { reason: "not_in_tenant_or_already_revoked" },
    })
    throw new Error("Key not found")
  }

  revalidatePath("/clinic/api")
}
