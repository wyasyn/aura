import { betterAuth } from "better-auth"
import { APIError, createAuthMiddleware } from "better-auth/api"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { admin, emailOTP, organization } from "better-auth/plugins"

import {
  accessDenialMessage,
  decideAccess,
  getAffiliationByEmail,
} from "@/lib/clinics/access-gate"
import { normalizeHostname } from "@/lib/clinics/subdomain"
import { readCookie, selectedTenantSubdomain } from "@/lib/clinics/tenant-request"
import { TENANT_COOKIE } from "@/lib/clinics/tenant-cookie"
import { requestOrigin } from "@/lib/clinics/request-origin"

import { prisma } from "@/lib/db/client"
import { sendOtpEmail } from "@/lib/email/send-otp"
import { configuredOrigin, getSiteUrl } from "@/lib/site-url"

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
 * Resolves the clinic whose site this request is for, from the raw headers —
 * the auth hook runs outside Next's request helpers, so there is no cookies()
 * or headers() to call here.
 *
 * Reads the same host-then-pin-cookie precedence as lib/clinics/tenant.ts. It
 * used to read the Host header alone, which made every clinic account
 * unsignable-in on a deployment without a wildcard domain: the host is the
 * platform's for every tenant there, so this returned null, and decideAccess
 * correctly refused a clinic account on what it was told was the platform —
 * "This account belongs to a clinic. Please sign in on your clinic's own site."
 * The rule was right; the input was wrong.
 *
 * A verified custom domain identifies a clinic just as a subdomain does, and
 * was missed here for the same reason.
 */
async function hostOrganizationId(headers: Headers | undefined): Promise<string | null> {
  const host = headers?.get("host") ?? null

  const subdomain = selectedTenantSubdomain({
    host,
    pinnedTenant: readCookie(headers?.get("cookie"), TENANT_COOKIE),
  })

  if (subdomain) {
    const clinic = await prisma.clinicSettings.findUnique({
      where: { subdomain },
      select: { organizationId: true },
    })
    return clinic?.organizationId ?? null
  }

  const normalized = normalizeHostname(host)
  if (!normalized) return null

  const byDomain = await prisma.clinicSettings.findUnique({
    where: { customDomain: normalized },
    select: { organizationId: true, customDomainVerifiedAt: true },
  })

  // An unproven domain is not this clinic's to be signed in on.
  return byDomain?.customDomainVerifiedAt ? byDomain.organizationId : null
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

  // Trust the origin this request arrived on, but only when configuration says
  // this deployment answers there: the canonical origin, anything in
  // TRUSTED_ORIGINS, or — on Vercel — a platform-injected alias.
  //
  // The Host header is client-supplied everywhere, and behind an ALB or App
  // Runner there is no platform value to check it against. So the match is
  // against configuration and nothing else. With nothing configured the set
  // still holds getSiteUrl(), which means an unrecognised Host is refused
  // rather than trusted — the failure mode is "cannot sign in", not "anyone
  // can name themselves the origin".
  // The normalised origin is what gets trusted, not the raw candidate: a
  // request arriving with X-Forwarded-Proto: http on a real host would
  // otherwise add a plaintext origin to the trusted set.
  try {
    const trusted = configuredOrigin(await requestOrigin())
    if (trusted) {
      origins.push(trusted)
    }
  } catch (error) {
    console.error("[auth] Request origin resolution failed", error)
  }

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
  baseURL: getSiteUrl(),
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
