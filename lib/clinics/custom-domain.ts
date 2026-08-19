import { randomBytes } from "node:crypto"
import { promises as dns } from "node:dns"

import { VERIFICATION_RECORD_PREFIX } from "@/lib/clinics/domain-constants"
import { platformRootDomain } from "@/lib/clinics/subdomain"

/**
 * Custom domains: a clinic points a domain it owns at the platform, proves
 * ownership with a DNS TXT record, and is then served on it.
 *
 * Verification is a real lookup rather than a stored flag, because the record
 * is the only thing that distinguishes a domain someone controls from one they
 * merely typed — including a competitor's.
 */

export type DomainValidation =
  | { ok: true; domain: string }
  | { ok: false; error: string }

const HOSTNAME_RE = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/

/**
 * Normalises and checks a domain. Accepts what people actually paste — a URL,
 * a trailing slash, mixed case — and rejects anything that would collide with
 * the platform's own hosts.
 */
export function validateCustomDomain(raw: string): DomainValidation {
  let domain = raw.trim().toLowerCase()
  if (!domain) return { ok: false, error: "Enter a domain." }

  // Tolerate a pasted URL.
  domain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.$/, "")
  // A port would make this a different host than the one we would be served on.
  if (domain.includes(":")) {
    return { ok: false, error: "Enter the domain only, without a port." }
  }
  if (domain.startsWith("www.")) {
    // Not an error worth blocking on, but the apex or a subdomain is what they
    // almost always mean, and www would need its own record anyway.
    return {
      ok: false,
      error: "Enter the domain without www, for example skin.yourclinic.com.",
    }
  }

  if (!HOSTNAME_RE.test(domain)) {
    return { ok: false, error: "That does not look like a valid domain." }
  }

  if (domain === "localhost" || domain.endsWith(".localhost")) {
    return { ok: false, error: "That domain cannot be used." }
  }

  // Claiming the platform's own domain, or any subdomain of it, would let a
  // clinic intercept the platform host or another tenant's subdomain.
  const root = platformRootDomain()
  if (root && (domain === root || domain.endsWith(`.${root}`))) {
    return {
      ok: false,
      error: "That domain belongs to the platform. Use a domain you own.",
    }
  }

  return { ok: true, domain }
}

export function generateVerificationToken(): string {
  return `aurora-verify-${randomBytes(16).toString("hex")}`
}

export type VerificationResult =
  | { verified: true }
  | { verified: false; reason: string }

/**
 * Looks up the TXT record and checks the token is present.
 *
 * DNS answers are cached by resolvers, so a clinic that has just added the
 * record may need to retry — the messages say so rather than implying the
 * record is wrong.
 */
export async function verifyDomainOwnership(
  domain: string,
  token: string,
): Promise<VerificationResult> {
  const recordName = `${VERIFICATION_RECORD_PREFIX}.${domain}`

  let records: string[][]
  try {
    records = await dns.resolveTxt(recordName)
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === "ENOTFOUND" || code === "ENODATA") {
      return {
        verified: false,
        reason: `No TXT record found at ${recordName}. If you have just added it, DNS can take a few minutes to propagate.`,
      }
    }
    console.error("[domains] TXT lookup failed", { domain, code })
    return {
      verified: false,
      reason: "Could not look up that domain's DNS just now. Try again shortly.",
    }
  }

  // Each record arrives as chunks that must be joined before comparing.
  const values = records.map((chunks) => chunks.join(""))
  if (!values.includes(token)) {
    return {
      verified: false,
      reason: `Found a TXT record at ${recordName}, but not the expected value. Check it matches exactly.`,
    }
  }

  return { verified: true }
}
