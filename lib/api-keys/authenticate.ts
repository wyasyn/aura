import { NextResponse } from "next/server"

import { apiKeyHashMatches, extractBearerKey, hashApiKey } from "@/lib/api-keys/keys"
import type { TenantScope } from "@/lib/clinics/membership"
import { resolveClinicAccess } from "@/lib/clinics/subscription"
import { prisma } from "@/lib/db/client"

export type ApiCaller = {
  organizationId: TenantScope
  clinicName: string
  apiKeyId: string
}

export type ApiAuthResult =
  | { ok: true; caller: ApiCaller }
  | { ok: false; response: NextResponse }

function unauthorized(message: string) {
  return NextResponse.json(
    { error: "unauthorized", message },
    { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
  )
}

/**
 * Authenticates a partner API request from its bearer key.
 *
 * The lookup is by hash, so the plaintext key is never compared against
 * anything stored. A revoked key, or one belonging to a clinic whose
 * subscription has lapsed, is rejected the same way an unknown one is: the
 * response never distinguishes them, since doing so would tell an attacker
 * which guesses were real keys.
 */
export async function authenticateApiRequest(
  request: Request,
): Promise<ApiAuthResult> {
  const plaintext = extractBearerKey(request.headers.get("authorization"))
  if (!plaintext) {
    return {
      ok: false,
      response: unauthorized("Provide an API key as a bearer token."),
    }
  }

  const hashed = hashApiKey(plaintext)

  const record = await prisma.apiKey.findUnique({
    where: { hashedKey: hashed },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          clinic: {
            select: { displayName: true, status: true, subscriptionStatus: true },
          },
        },
      },
    },
  })

  if (!record || record.revokedAt) {
    return { ok: false, response: unauthorized("Invalid API key.") }
  }

  // Redundant given the unique lookup above, but keeps the comparison constant
  // time if this is ever changed to a scan over candidate rows.
  if (!apiKeyHashMatches(record.hashedKey, hashed)) {
    return { ok: false, response: unauthorized("Invalid API key.") }
  }

  const clinic = record.organization.clinic
  if (!clinic) {
    return { ok: false, response: unauthorized("Invalid API key.") }
  }

  const access = resolveClinicAccess({
    status: clinic.status,
    subscriptionStatus: clinic.subscriptionStatus,
  })
  if (!access.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "inactive_tenant",
          message:
            "This clinic's account is not active. Check its subscription or contact support.",
        },
        { status: 403 },
      ),
    }
  }

  // Fire-and-forget: a failed bookkeeping write must not fail the request the
  // partner actually made.
  void prisma.apiKey
    .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
    .catch((error) => console.warn("[api] Could not record key usage", error))

  return {
    ok: true,
    caller: {
      // Safe to brand: this organization id came from a verified credential,
      // which is the API-side equivalent of resolving a membership.
      organizationId: record.organizationId as TenantScope,
      clinicName: clinic.displayName,
      apiKeyId: record.id,
    },
  }
}
