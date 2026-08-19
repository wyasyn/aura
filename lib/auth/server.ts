import { betterAuth } from "better-auth"
import { APIError, createAuthMiddleware } from "better-auth/api"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { admin, emailOTP, organization } from "better-auth/plugins"

import {
  accessDenialMessage,
  decideAccess,
  getAffiliationByEmail,
} from "@/lib/clinics/access-gate"
import { extractSubdomain } from "@/lib/clinics/subdomain"

import { prisma } from "@/lib/db/client"
import { sendOtpEmail } from "@/lib/email/send-otp"

const googleConfigured =
  Boolean(process.env.GOOGLE_CLIENT_ID) &&
  Boolean(process.env.GOOGLE_CLIENT_SECRET)

const appleConfigured =
  Boolean(process.env.APPLE_CLIENT_ID) &&
  Boolean(process.env.APPLE_CLIENT_SECRET)

/**
 * White-label clinics are served on their own subdomains, which are different
 * origins from BETTER_AUTH_URL. Without these patterns better-auth rejects
 * every auth request from a clinic's site with "Invalid origin", so no patient
 * or staff member can sign in there at all.
 *
 * Wildcards are matched by better-auth against the request origin when the
 * pattern includes a scheme (see auth/trusted-origins).
 */
function tenantTrustedOrigins(): string[] {
  const origins: string[] = []

  const root = process.env.NEXT_PUBLIC_TENANT_ROOT_DOMAIN?.trim().toLowerCase()
  if (root) {
    origins.push(`https://*.${root}`)
  }

  // Local development serves tenants at <subdomain>.localhost on the dev port.
  const baseUrl = process.env.BETTER_AUTH_URL
  if (baseUrl?.includes("localhost")) {
    let port = "3000"
    try {
      port = new URL(baseUrl).port || "3000"
    } catch {
      // Malformed BETTER_AUTH_URL; fall back to the default dev port.
    }
    origins.push(`http://*.localhost:${port}`)
  }

  return origins
}

/**
 * Resolves the clinic that owns the host this request arrived on, from the raw
 * Host header — the auth hook runs outside Next's request helpers.
 */
async function hostOrganizationId(headers: Headers | undefined): Promise<string | null> {
  const subdomain = extractSubdomain(headers?.get("host"))
  if (!subdomain) return null

  const clinic = await prisma.clinicSettings.findUnique({
    where: { subdomain },
    select: { organizationId: true },
  })
  return clinic?.organizationId ?? null
}

/**
 * Refuses authentication where the account does not belong to the site it is
 * being used on. See lib/clinics/access-gate.ts for the rules.
 *
 * Enforced here, at the authentication endpoints, rather than only after a
 * session exists — a refused person should never get a session cookie at all,
 * and gating OTP issuance means we don't email a code for an account that
 * cannot sign in here anyway.
 */
const clinicIsolationHook = createAuthMiddleware(async (ctx) => {
  const GATED_PATHS = new Set([
    "/sign-in/email",
    "/sign-up/email",
    "/email-otp/send-verification-otp",
    "/forget-password",
  ])
  if (!GATED_PATHS.has(ctx.path)) return

  const email = (ctx.body as { email?: unknown } | undefined)?.email
  if (typeof email !== "string" || !email) return

  const affiliation = await getAffiliationByEmail(email)

  // No account yet. Signing up is how a clinic acquires a patient, so let it
  // through; the link to this clinic is created after the account exists.
  if (!affiliation) return

  const decision = decideAccess(affiliation, await hostOrganizationId(ctx.headers))
  if (decision.allowed) return

  throw new APIError("FORBIDDEN", {
    message: accessDenialMessage(decision.reason),
  })
})

/**
 * Verified custom domains are origins too, and they are not known at startup.
 *
 * Resolved per request against the database: without this, a clinic on its own
 * domain hits the same "Invalid origin" wall that made every subdomain
 * unusable, and nobody could sign in there. Only the requesting host is ever
 * returned, so this cannot be used to widen trust to an arbitrary origin.
 */
async function trustedOriginsForRequest(request?: Request): Promise<string[]> {
  const origins = tenantTrustedOrigins()
  if (!request) return origins

  let host: string | null = null
  try {
    host = new URL(request.url).host.toLowerCase()
  } catch {
    return origins
  }
  if (!host) return origins

  try {
    const clinic = await prisma.clinicSettings.findFirst({
      where: { customDomain: host, customDomainVerifiedAt: { not: null } },
      select: { id: true },
    })
    if (clinic) {
      origins.push(`https://${host}`, `http://${host}`)
    }
  } catch (error) {
    // A lookup failure must not lock out the platform and its subdomains,
    // which are trusted statically above.
    console.error("[auth] Custom domain origin lookup failed", error)
  }

  return origins
}

export const auth = betterAuth({
  appName: "Aurora Organics",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: trustedOriginsForRequest,
  hooks: { before: clinicIsolationHook },
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  // Credential and OTP endpoints are otherwise unthrottled, which makes both
  // password guessing and OTP brute force free. Sign-in and OTP issuance get
  // tighter windows than the global default.
  rateLimit: {
    enabled: true,
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 5 },
      "/email-otp/send-verification-otp": { window: 60, max: 3 },
      "/email-otp/verify-email": { window: 60, max: 10 },
      "/email-otp/reset-password": { window: 60, max: 5 },
      "/forget-password": { window: 60, max: 3 },
      "/reset-password": { window: 60, max: 5 },
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },
  socialProviders: {
    ...(googleConfigured
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
            prompt: "select_account",
          },
        }
      : {}),
    ...(appleConfigured
      ? {
          apple: {
            clientId: process.env.APPLE_CLIENT_ID as string,
            clientSecret: process.env.APPLE_CLIENT_SECRET as string,
            appBundleIdentifier: process.env.APPLE_APP_BUNDLE_IDENTIFIER,
          },
        }
      : {}),
  },
  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        // Awaited so a delivery failure surfaces as an error instead of the
        // client showing "code sent" for a code that never left the building.
        await sendOtpEmail({ email, otp, type })
      },
      otpLength: 6,
      expiresIn: 60 * 10,
    }),
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
    organization({
      allowUserToCreateOrganization: true,
    }),
  ],
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60,
      strategy: "compact",
      version: (session, user) =>
        `${user.role ?? "user"}:${user.onboardingCompleted}:${user.banned}:${user.updatedAt?.toString() ?? ""}`,
    },
    deferSessionRefresh: true,
  },
  user: {
    additionalFields: {
      onboardingCompleted: {
        type: "boolean",
        defaultValue: false,
        input: false,
      },
    },
  },
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
