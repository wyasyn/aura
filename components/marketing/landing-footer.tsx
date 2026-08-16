import { cacheLife } from "next/cache"

import { Footer20 } from "@/components/ui/footer-20"
import { AURORA_STORE_ORIGIN } from "@/lib/products/constants"

/**
 * The copyright year does not need to reflect the exact moment of a request,
 * so it is cached and the footer stays prerenderable.
 */
async function getCurrentYear() {
  "use cache"
  cacheLife("days")
  return new Date().getFullYear()
}

export async function LandingFooter() {
  return (
    <Footer20
      year={await getCurrentYear()}
      description="Clear skin insights, routines built for you, and product matches you can act on. Thoughtful skincare, made personal."
      email="info@auroraorganics.co"
      links={{
        good: [
          { label: "Home", href: "/" },
          { label: "Start your scan", href: "/scan" },
          { label: "Sign in", href: "/login" },
          { label: "Sign up", href: "/signup" },
        ],
        boring: [
          { label: "Terms of use", href: "/terms" },
          { label: "Privacy policy", href: "/privacy" },
          { label: "Data deletion", href: "/privacy/data-deletion" },
          { label: "Help", href: "/help" },
        ],
        cool: [
          { label: "Aurora Organics", href: AURORA_STORE_ORIGIN },
          { label: "Embed skin scan", href: "/embed/scan" },
          { label: "Contact", href: "mailto:info@auroraorganics.co" },
        ],
      }}
    />
  )
}
