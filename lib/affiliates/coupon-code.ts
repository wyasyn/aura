import { randomBytes } from "node:crypto"

/** e.g. "Dr Sarah Nakato" -> "AURORA-SARAHNAKATO-K3F9" */
export function generateCouponCode(name: string): string {
  const slug = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 16)
  const suffix = randomBytes(2).toString("hex").toUpperCase()
  return `AURORA-${slug || "PARTNER"}-${suffix}`
}
