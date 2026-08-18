import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { admin, emailOTP, organization } from "better-auth/plugins"

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

export const auth = betterAuth({
  appName: "Aurora Organics",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: tenantTrustedOrigins(),
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
