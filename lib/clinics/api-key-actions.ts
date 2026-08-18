"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { issueApiKey } from "@/lib/api-keys/keys"
import { requireClinicManager } from "@/lib/clinics/membership"
import { prisma } from "@/lib/db/client"

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

  await prisma.apiKey.create({
    data: {
      organizationId: session.scope,
      name,
      hashedKey: issued.hashedKey,
      keyPrefix: issued.keyPrefix,
      createdById: session.userId,
    },
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
  const result = await prisma.apiKey.updateMany({
    where: { id: apiKeyId, organizationId: session.scope, revokedAt: null },
    data: { revokedAt: new Date() },
  })
  if (result.count === 0) throw new Error("Key not found")

  revalidatePath("/clinic/api")
}
